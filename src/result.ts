// ─────────────────────────────────────────────────────────────────────────────
// Base64 helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse image data that may arrive as:
 *  - base64 String  (most common from the JS bridge)
 *  - JSON array of ints  `[255, 216, ...]`
 *  - Uint8Array serialised by JSON.stringify  `{"0":255,"1":216,...}`
 *
 * In React Native there are no Uint8List or byte arrays — images are always
 * represented as base64 strings for use with <Image source={{ uri: `data:image/jpeg;base64,${b64}` }} />
 */
export function parseImageData(data: any): string | null {
  if (data == null) return null;

  // Already a base64 string
  if (typeof data === 'string' && data.length > 0) return data;

  // JSON array of ints → base64
  if (Array.isArray(data)) {
    return _uint8ArrayToBase64(new Uint8Array(data));
  }

  // {"0":255,"1":216,...} format (JSON.stringify of a Uint8Array)
  if (typeof data === 'object' && data.constructor === Object) {
    const keys = Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b));
    const bytes = new Uint8Array(keys.map((k) => Number(data[k])));
    return _uint8ArrayToBase64(bytes);
  }

  return null;
}

function _uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in React Native's Hermes / JSC environments
  return btoa(binary);
}

function _base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion helpers — base64 ↔ bytes (Uint8Array)
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a base64 string to Uint8Array (bytes). */
export function base64ToBytes(b64: string): Uint8Array {
  return _base64ToUint8Array(b64);
}

/** Convert Uint8Array (bytes) to base64 string. */
export function bytesToBase64(bytes: Uint8Array): string {
  return _uint8ArrayToBase64(bytes);
}

/** Get ExtractedPhoto image as Uint8Array bytes. */
export function extractedPhotoImageBytes(photo: ExtractedPhoto): Uint8Array {
  return _base64ToUint8Array(photo.imageBase64);
}

/** Get ExtractedPhoto image as base64 string (already stored as base64, alias for clarity). */
export function extractedPhotoToBase64(photo: ExtractedPhoto): string {
  return photo.imageBase64;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification status
// ─────────────────────────────────────────────────────────────────────────────

/** Outcome of a single verification step or the overall KYC session. */
export enum VerificationStatus {
  pass   = 'pass',
  review = 'review',
  reject = 'reject',
  error  = 'error',
}

export function verificationStatusFromString(s?: string | null): VerificationStatus {
  switch ((s ?? '').toUpperCase()) {
    case 'PASS':   return VerificationStatus.pass;
    case 'REVIEW': return VerificationStatus.review;
    case 'REJECT': return VerificationStatus.reject;
    default:       return VerificationStatus.error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ExtractedPhoto
// ─────────────────────────────────────────────────────────────────────────────

/** Extracted photo from document (e.g. the face photo inside a CIN). */
export interface ExtractedPhoto {
  /** Base64-encoded JPEG image */
  imageBase64: string;
  confidence: number;
  width: number;
  height: number;
  bbox: number[];
  area: number;
}

export function extractedPhotoFromJson(json: Record<string, any>): ExtractedPhoto {
  return {
    imageBase64: parseImageData(json['imageBytes'] ?? json['image'] ?? json['imageBase64']) ?? '',
    confidence:  Number(json['confidence'] ?? 0),
    width:       Number(json['width']      ?? 0),
    height:      Number(json['height']     ?? 0),
    bbox:        Array.isArray(json['bbox']) ? json['bbox'].map(Number) : [],
    area:        Number(json['area']       ?? 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ExtractedField
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single extracted field with generic key, document-specific key, label and value.
 * This allows dynamic field display without hardcoding field names.
 */
export interface ExtractedField {
  /** Generic key, e.g. "document_id", "first_name", "birth_region" */
  key: string;
  /** Document-specific key, e.g. "numero_carte", "prenoms" */
  documentKey: string;
  /** Localised label for display */
  label: string;
  /** The extracted value (string, number, array, or object) */
  value: any;
  /** Display priority — lower = show first (default 999) */
  displayPriority: number;
  /** Icon name for display, e.g. "credit_card", "user", "calendar" */
  icon?: string;
}

export function extractedFieldStringValue(field: ExtractedField): string | null {
  const { value } = field;
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((e) => e?.toString() ?? '').join(', ');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }
  return String(value);
}

export function extractedFieldFromJson(json: Record<string, any>): ExtractedField {
  return {
    key:             (json['key']                                               as string) ?? '',
    documentKey:     (json['documentKey'] ?? json['document_key'] ?? json['key'] as string) ?? '',
    label:           (json['label']                                             as string) ?? '',
    value:           json['value'],
    displayPriority: Number(json['displayPriority'] ?? json['display_priority'] ?? 999),
    icon:            json['icon'] as string | undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentData
// ─────────────────────────────────────────────────────────────────────────────

/** Extracted document data (OCR). */
export interface DocumentData {
  fields: ExtractedField[];
  documentType?: string;
  documentCategory?: string;
  documentCategoryLabel?: string;
}

/** Get fields sorted by displayPriority (lower = first). */
export function documentDataSortedFields(data: DocumentData): ExtractedField[] {
  return [...data.fields].sort((a, b) => a.displayPriority - b.displayPriority);
}

/** Get field by key (generic or document key). */
export function documentDataGetField(
  data: DocumentData,
  key: string,
): ExtractedField | undefined {
  return data.fields.find((f) => f.key === key || f.documentKey === key);
}

/** Get field value by key as string. */
export function documentDataGetValue(
  data: DocumentData,
  key: string,
): string | undefined {
  const field = documentDataGetField(data, key);
  return field ? extractedFieldStringValue(field) ?? undefined : undefined;
}

export function documentDataFromJson(json: Record<string, any>): DocumentData {
  // JS SDK sends { fields: [...], documentType, ... }
  // Native SDK may send { extraction: [...], document_type, ... }
  const fieldsList = json['fields'] ?? json['extraction'];

  if (Array.isArray(fieldsList)) {
    return {
      fields: fieldsList.map((e) => extractedFieldFromJson(e as Record<string, any>)),
      documentType:          (json['documentType']          ?? json['document_type']          ) as string | undefined,
      documentCategory:      (json['documentCategory']      ?? json['document_category']      ) as string | undefined,
      documentCategoryLabel: (json['documentCategoryLabel'] ?? json['document_category_label']) as string | undefined,
    };
  }

  // Legacy format: extraction as Record<string, string>
  const extraction: Record<string, any> =
    typeof json['extraction'] === 'object' && !Array.isArray(json['extraction'])
      ? json['extraction']
      : json;

  const fields: ExtractedField[] = [];
  let priority = 1;
  for (const [key, value] of Object.entries(extraction)) {
    if (value != null && String(value).length > 0) {
      fields.push({
        key,
        documentKey: key,
        label: key,
        value,
        displayPriority: priority++,
      });
    }
  }

  return {
    fields,
    documentType:          (json['documentType']          ?? json['document_type']          ) as string | undefined,
    documentCategory:      (json['documentCategory']      ?? json['document_category']      ) as string | undefined,
    documentCategoryLabel: (json['documentCategoryLabel'] ?? json['document_category_label']) as string | undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FaceMatch
// ─────────────────────────────────────────────────────────────────────────────

/** Individual face match result from comparison. */
export interface FaceMatch {
  faceIndex: number;
  boundingBox: number[];
  detectionConfidence: number;
  similarityScore: number;
  isMatch: boolean;
  confidenceLevel: string;
}

export function faceMatchFromJson(json: Record<string, any>): FaceMatch {
  return {
    faceIndex:           Number(json['faceIndex']           ?? json['face_index']           ?? 0),
    boundingBox:         Array.isArray(json['boundingBox']  ?? json['bounding_box'])
                           ? (json['boundingBox'] ?? json['bounding_box']).map(Number)
                           : [],
    detectionConfidence: Number(json['detectionConfidence'] ?? json['detection_confidence'] ?? 0),
    similarityScore:     Number(json['similarityScore']     ?? json['similarity_score']     ?? 0),
    isMatch:             Boolean(json['isMatch']            ?? json['is_match']             ?? false),
    confidenceLevel:     (json['confidenceLevel']           ?? json['confidence_level']     ?? 'LOW') as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FaceResult
// ─────────────────────────────────────────────────────────────────────────────

/** Face verification result (selfie vs document photo). */
export interface FaceResult {
  success: boolean;
  isMatch: boolean;
  similarityScore: number;
  threshold: number;
  confidenceLevel: string;

  // Target face (document/CIN photo)
  targetFaceDetected: boolean;
  targetFaceConfidence: number;

  // Source faces (selfie — may contain multiple)
  sourceFacesCount: number;
  matches: FaceMatch[];
  bestMatch?: FaceMatch;

  // Model info
  detectionModel: string;
  recognitionModel: string;
  processingTimeMs: number;

  // Legacy backwards-compat fields
  cinFaceDetected: boolean;
  selfieFaceDetected: boolean;
}

export function faceResultFromJson(json: Record<string, any>): FaceResult {
  const matchesList: FaceMatch[] = Array.isArray(json['matches'])
    ? json['matches'].map((m: any) => faceMatchFromJson(m))
    : [];

  const bestMatchData = json['bestMatch'] ?? json['best_match'];
  const bestMatch: FaceMatch | undefined = bestMatchData
    ? faceMatchFromJson(bestMatchData)
    : undefined;

  let confidenceLevel = (json['confidenceLevel'] ?? json['confidence_level'] ?? '') as string;
  if (!confidenceLevel && bestMatch) confidenceLevel = bestMatch.confidenceLevel;
  if (!confidenceLevel) {
    const score = Number(json['similarityScore'] ?? json['similarity_score'] ?? 0);
    if (score >= 90)      confidenceLevel = 'VERY_HIGH';
    else if (score >= 70) confidenceLevel = 'HIGH';
    else if (score >= 50) confidenceLevel = 'MEDIUM';
    else                  confidenceLevel = 'LOW';
  }

  const targetDetected = Boolean(json['targetFaceDetected'] ?? json['target_face_detected'] ?? false);
  const srcCount       = Number(json['sourceFacesCount']    ?? json['source_faces_count']   ?? 0);

  return {
    success:              Boolean(json['success'] ?? false),
    isMatch:              Boolean(json['isMatch'] ?? json['is_match'] ?? bestMatch?.isMatch ?? false),
    similarityScore:      Number(json['similarityScore'] ?? json['similarity_score'] ?? bestMatch?.similarityScore ?? 0),
    threshold:            Number(json['threshold'] ?? 0.5),
    confidenceLevel,
    targetFaceDetected:   targetDetected,
    targetFaceConfidence: Number(json['targetFaceConfidence'] ?? json['target_face_confidence'] ?? 0),
    sourceFacesCount:     srcCount,
    matches:              matchesList,
    bestMatch,
    detectionModel:       (json['detectionModel']  ?? json['detection_model']   ?? 'scrfd_10g') as string,
    recognitionModel:     (json['recognitionModel']?? json['recognition_model'] ?? 'buffalo_l') as string,
    processingTimeMs:     Number(json['processingTimeMs'] ?? json['processing_time_ms'] ?? 0),
    // Legacy fields
    cinFaceDetected:      targetDetected || Boolean(json['cinFaceDetected'] ?? json['cin_face_detected'] ?? false),
    selfieFaceDetected:   srcCount > 0   || Boolean(json['selfieFaceDetected'] ?? json['selfie_face_detected'] ?? false),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FraudAnalysis
// ─────────────────────────────────────────────────────────────────────────────

/** Fraud analysis result (for backwards compatibility). */
export interface FraudAnalysis {
  score: number;
  status: string;
  indicators: string[];
  isLive: boolean;
  /** Component scores map */
  componentScores: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SelfieResult
// ─────────────────────────────────────────────────────────────────────────────

/** Selfie liveness result. */
export interface SelfieResult {
  success: boolean;
  isLive: boolean;
  confidence: number;
  status: VerificationStatus;
  /** Base64-encoded captured selfie image */
  capturedImageBase64?: string;
  userMessages: string[];
  observations: string[];
  spoofingIndicators: string[];
  challengesPassed: number;
  challengesTotal: number;
  processingTimeMs: number;
}

export function selfieResultFromJson(json: Record<string, any>): SelfieResult {
  return {
    success:            Boolean(json['success'] ?? false),
    isLive:             Boolean(json['isLive'] ?? json['is_live'] ?? false),
    confidence:         Number(json['confidence'] ?? 0),
    status:             verificationStatusFromString(json['status'] as string | undefined),
    capturedImageBase64: parseImageData(json['capturedImage'] ?? json['captured_image']) ?? undefined,
    userMessages:       ((json['userMessages'] ?? json['user_messages']) as any[] | undefined)?.map(String) ?? [],
    observations:       (json['observations'] as any[] | undefined)?.map(String)         ?? [],
    spoofingIndicators: ((json['spoofingIndicators'] ?? json['spoofing_indicators']) as any[] | undefined)?.map(String) ?? [],
    challengesPassed:   Number(json['challengesPassed'] ?? json['challenges_passed'] ?? 0),
    challengesTotal:    Number(json['challengesTotal']  ?? json['challenges_total']  ?? 0),
    processingTimeMs:   Number(json['processingTimeMs'] ?? json['processing_time_ms'] ?? 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentResult
// ─────────────────────────────────────────────────────────────────────────────

/** Document analysis result (recto or verso). */
export interface DocumentResult {
  success: boolean;
  isLive: boolean;
  score: number;
  confidenceLevel: string;
  status: VerificationStatus;
  /** Base64-encoded aligned document image */
  alignedDocumentBase64?: string;
  extraction?: DocumentData;
  extractedPhotos: ExtractedPhoto[];
  faceVerification?: FaceResult;
  userMessages: string[];
  fraudIndicators: string[];
  processingTimeMs: number;
}

export function documentResultFromJson(json: Record<string, any>): DocumentResult {
  const extractionData = json['extraction'] as Record<string, any> | undefined;
  const photosData     = (json['extractedPhotos'] ?? json['extracted_photos']) as any[] | undefined;
  const faceData       = (json['faceVerification'] ?? json['face_verification']) as Record<string, any> | undefined;

  return {
    success:               Boolean(json['success'] ?? false),
    isLive:                Boolean(json['isLive'] ?? json['is_live'] ?? false),
    score:                 Number(json['score'] ?? 0),
    confidenceLevel:       (json['confidenceLevel'] ?? json['confidence'] ?? 'LOW') as string,
    status:                verificationStatusFromString(json['status'] as string | undefined),
    alignedDocumentBase64: parseImageData(json['alignedDocument'] ?? json['aligned_document']) ?? undefined,
    extraction:            extractionData ? documentDataFromJson(extractionData) : undefined,
    extractedPhotos:       photosData?.map((e) => extractedPhotoFromJson(e)) ?? [],
    faceVerification:      faceData ? faceResultFromJson(faceData) : undefined,
    userMessages:          ((json['userMessages'] ?? json['user_messages']) as any[] | undefined)?.map(String) ?? [],
    fraudIndicators:       ((json['fraudIndicators'] ?? json['fraud_indicators']) as any[] | undefined)?.map(String) ?? [],
    processingTimeMs:      Number(json['processingTimeMs'] ?? json['processing_time_ms'] ?? 0),
  };
}

/** Convenience: get the main extracted photo from a DocumentResult */
export function documentResultMainPhoto(result: DocumentResult): ExtractedPhoto | undefined {
  return result.extractedPhotos.length > 0 ? result.extractedPhotos[0] : undefined;
}

/** Convenience: build a FraudAnalysis from a DocumentResult (backwards compat) */
export function documentResultFraudAnalysis(result: DocumentResult): FraudAnalysis {
  return {
    score:           result.score,
    status:          result.status.toUpperCase(),
    indicators:      result.fraudIndicators,
    isLive:          result.isLive,
    componentScores: { overall: result.score, liveness: result.isLive ? 1.0 : 0.0 },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// KYCResult
// ─────────────────────────────────────────────────────────────────────────────

/** Complete KYC result returned from the WebView bridge. */
export interface KYCResult {
  success: boolean;
  overallStatus: VerificationStatus;
  sessionId?: string;
  selfieResult?: SelfieResult;
  rectoResult?: DocumentResult;
  versoResult?: DocumentResult;
  rejectionReason?: string;
  rejectionMessage?: string;
  fraudIndicators: string[];
  totalProcessingTimeMs: number;
  errorMessage?: string;
  errorCode?: string;
}

// ── Convenience accessors ────────────────────────────────────────────────────

/** Base64-encoded selfie image */
export function kycResultSelfieImage(result: KYCResult): string | undefined {
  return result.selfieResult?.capturedImageBase64;
}

/** Base64-encoded aligned recto document image */
export function kycResultRectoImage(result: KYCResult): string | undefined {
  return result.rectoResult?.alignedDocumentBase64;
}

/** Base64-encoded aligned verso document image */
export function kycResultVersoImage(result: KYCResult): string | undefined {
  return result.versoResult?.alignedDocumentBase64;
}

/** Main extracted photo (face photo from document) */
export function kycResultMainPhoto(result: KYCResult): ExtractedPhoto | undefined {
  const recto = result.rectoResult ? documentResultMainPhoto(result.rectoResult) : undefined;
  const verso = result.versoResult ? documentResultMainPhoto(result.versoResult) : undefined;
  return recto ?? verso;
}

/** Whether the face match passed */
export function kycResultFaceMatches(result: KYCResult): boolean | undefined {
  return result.rectoResult?.faceVerification?.isMatch
    ?? result.versoResult?.faceVerification?.isMatch;
}

/** Overall authenticity score (average of available recto/verso scores) */
export function kycResultAuthenticityScore(result: KYCResult): number {
  const scores: number[] = [];
  if (result.rectoResult) scores.push(result.rectoResult.score);
  if (result.versoResult) scores.push(result.versoResult.score);
  if (scores.length === 0) return 0.0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Get any extracted field by key from recto or verso */
export function kycResultGetExtractedValue(result: KYCResult, key: string): string | undefined {
  if (result.rectoResult?.extraction) {
    const v = documentDataGetValue(result.rectoResult.extraction, key);
    if (v != null) return v;
  }
  if (result.versoResult?.extraction) {
    return documentDataGetValue(result.versoResult.extraction, key);
  }
  return undefined;
}

/** Face similarity score from recto or verso */
export function kycResultFaceSimilarityScore(result: KYCResult): number | undefined {
  return result.rectoResult?.faceVerification?.similarityScore
    ?? result.versoResult?.faceVerification?.similarityScore;
}

/** Whether any extracted photos exist in recto or verso */
export function kycResultHasExtractedPhotos(result: KYCResult): boolean {
  return (result.rectoResult?.extractedPhotos?.length ?? 0) > 0
    || (result.versoResult?.extractedPhotos?.length ?? 0) > 0;
}

/** All extracted photos from both recto and verso */
export function kycResultAllExtractedPhotos(result: KYCResult): ExtractedPhoto[] {
  return [
    ...(result.rectoResult?.extractedPhotos ?? []),
    ...(result.versoResult?.extractedPhotos ?? []),
  ];
}

// ── Parsing functions ────────────────────────────────────────────────────────

export function parseKYCResult(json: Record<string, any>): KYCResult {
  const selfieData = (json['selfieResult'] ?? json['selfie_result']) as Record<string, any> | undefined;
  const rectoData  = (json['rectoResult']  ?? json['recto_result'])  as Record<string, any> | undefined;
  const versoData  = (json['versoResult']  ?? json['verso_result'])  as Record<string, any> | undefined;

  return {
    success:              Boolean(json['success'] ?? false),
    overallStatus:        verificationStatusFromString(
                            (json['overallStatus'] ?? json['overall_status']) as string | undefined
                          ),
    sessionId:            (json['sessionId'] ?? json['session_id'])              as string | undefined,
    selfieResult:         selfieData ? selfieResultFromJson(selfieData)           : undefined,
    rectoResult:          rectoData  ? documentResultFromJson(rectoData)          : undefined,
    versoResult:          versoData  ? documentResultFromJson(versoData)          : undefined,
    rejectionReason:      (json['rejectionReason']      ?? json['rejection_reason'])       as string | undefined,
    rejectionMessage:     (json['rejectionMessage']     ?? json['rejection_message'])      as string | undefined,
    fraudIndicators:      ((json['fraudIndicators']     ?? json['fraud_indicators']) as any[] | undefined)?.map(String) ?? [],
    totalProcessingTimeMs: Number(json['totalProcessingTimeMs'] ?? json['total_processing_time_ms'] ?? 0),
    errorMessage:         (json['errorMessage']         ?? json['error_message'])          as string | undefined,
    errorCode:            (json['errorCode']            ?? json['error_code'])             as string | undefined,
  };
}

export function parseKYCResultFromString(jsonString: string): KYCResult {
  try {
    const parsed = JSON.parse(jsonString);
    return parseKYCResult(parsed as Record<string, any>);
  } catch (e) {
    return createErrorResult(`Failed to parse result: ${e}`);
  }
}

export function createErrorResult(message: string, errorCode?: string): KYCResult {
  return {
    success: false,
    overallStatus: VerificationStatus.error,
    fraudIndicators: [],
    totalProcessingTimeMs: 0,
    errorMessage: message,
    errorCode,
  };
}
