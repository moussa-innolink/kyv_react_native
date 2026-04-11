// ═════════════════════════════════════════════════════════════════════════════
// Enums — 100% API-compatible with Flutter Lite SDK
// ═════════════════════════════════════════════════════════════════════════════

/** Capture step types for KYC flow */
export enum CaptureStep {
  /** Face liveness verification (selfie) */
  selfie = 'selfie',
  /** Document front side */
  recto = 'recto',
  /** Document back side */
  verso = 'verso',
}

/** Challenge mode for liveness verification (security level) */
export enum ChallengeMode {
  /** Single challenge — fastest */
  minimal = 'minimal',
  /** 2–3 challenges — balanced security/UX (default) */
  standard = 'standard',
  /** 4–5 challenges — maximum security */
  strict = 'strict',
}

/** Display mode for selfie screen (UI layout) */
export enum SelfieDisplayMode {
  /** Standard layout: challenge animation below camera (default) */
  standard = 'standard',
  /** Compact layout: challenge overlaid on camera */
  compact = 'compact',
  /** Immersive layout: full-screen camera with all elements overlaid */
  immersive = 'immersive',
  /** Neon HUD layout: futuristic dark theme with glow effects */
  neonHud = 'neonHud',
}

/** Display mode for document capture screen (UI layout) */
export enum DocumentDisplayMode {
  /** Standard layout: document frame centered, instructions below (default) */
  standard = 'standard',
  /** Compact layout: larger document frame, instructions overlaid */
  compact = 'compact',
  /** Immersive layout: full-screen with blur around document frame */
  immersive = 'immersive',
  /** Neon HUD layout: futuristic dark theme with glow effects */
  neonHud = 'neonHud',
}

/** How many times to play the challenge audio instruction */
export enum ChallengeAudioRepeat {
  /** Play once */
  once = 'once',
  /** Play twice with pause between */
  twice = 'twice',
  /** Play three times with pause between */
  thrice = 'thrice',
}

/** Returns the numeric count for a ChallengeAudioRepeat value */
export function challengeAudioRepeatCount(r: ChallengeAudioRepeat): number {
  switch (r) {
    case ChallengeAudioRepeat.once:   return 1;
    case ChallengeAudioRepeat.twice:  return 2;
    case ChallengeAudioRepeat.thrice: return 3;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Document model classes
// ═════════════════════════════════════════════════════════════════════════════

/** Supported sides for a document + OCR detection thresholds */
export interface KyvshieldDocumentSides {
  hasRecto: boolean;
  hasVerso: boolean;
  rectoMinCharOcr?: number;
  rectoMinBlockOcr?: number;
  rectoMinCharOcrWeb?: number;
  rectoMinBlockOcrWeb?: number;
  versoMinCharOcr?: number;
  versoMinBlockOcr?: number;
  versoMinCharOcrWeb?: number;
  versoMinBlockOcrWeb?: number;
}

export function kyvshieldDocumentSidesFromJson(json: Record<string, any>): KyvshieldDocumentSides {
  return {
    hasRecto:            (json['has_recto']              as boolean) ?? false,
    hasVerso:            (json['has_verso']              as boolean) ?? false,
    rectoMinCharOcr:     (json['recto_min_char_ocr']     as number)  ?? 0,
    rectoMinBlockOcr:    (json['recto_min_block_ocr']    as number)  ?? 0,
    rectoMinCharOcrWeb:  (json['recto_min_char_ocr_web'] as number)  ?? 0,
    rectoMinBlockOcrWeb: (json['recto_min_block_ocr_web']as number)  ?? 0,
    versoMinCharOcr:     (json['verso_min_char_ocr']     as number)  ?? 0,
    versoMinBlockOcr:    (json['verso_min_block_ocr']    as number)  ?? 0,
    versoMinCharOcrWeb:  (json['verso_min_char_ocr_web'] as number)  ?? 0,
    versoMinBlockOcrWeb: (json['verso_min_block_ocr_web']as number)  ?? 0,
  };
}

/** Document type model from /api/v1/documents */
export interface KyvshieldDocument {
  docType: string;
  category?: string;
  categoryLabel?: string;
  name?: string;
  country?: string;
  countryName?: string;
  enabled?: boolean;
  supportedSides?: KyvshieldDocumentSides;
}

export function kyvshieldDocumentFromJson(json: Record<string, any>): KyvshieldDocument {
  return {
    docType:       (json['doc_type']                   as string) ?? '',
    category:      (json['document_category']          as string) ?? '',
    categoryLabel: (json['document_category_label']    as string) ?? '',
    name:          (json['name']                       as string) ?? '',
    country:       (json['country']                    as string) ?? '',
    countryName:   (json['country_name']               as string) ?? '',
    enabled:       (json['enabled']                    as boolean) ?? false,
    supportedSides: json['supported_sides']
      ? kyvshieldDocumentSidesFromJson(json['supported_sides'])
      : { hasRecto: false, hasVerso: false },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Theme configuration
// ═════════════════════════════════════════════════════════════════════════════

/** Theme configuration for customizing SDK colors */
export interface KyvshieldThemeConfig {
  /** Primary brand color as CSS hex string, e.g. "#EF8352" */
  primaryColor?: string;
  /** Success color as CSS hex string */
  successColor?: string;
  /** Warning color as CSS hex string */
  warningColor?: string;
  /** Error color as CSS hex string */
  errorColor?: string;
  /**
   * Theme mode override.
   * - `true`  → dark
   * - `false` → light
   * - `undefined` → follow system (default)
   */
  darkMode?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// Main SDK configuration
// ═════════════════════════════════════════════════════════════════════════════

/** Main SDK configuration */
export interface KyvshieldConfig {
  /** API base URL (required), e.g. "https://kyvshield-naruto.innolinkcloud.com" */
  baseUrl: string;
  /** API key for authentication (required) */
  apiKey: string;
  /** API version (default: 'v1') */
  apiVersion?: string;
  /** Enable detailed logging for debugging (default: false) */
  enableLog?: boolean;
  /** HTTP request timeout in seconds (default: 60) */
  timeoutSeconds?: number;
  /** Theme configuration (optional color overrides) */
  theme?: KyvshieldThemeConfig;
  /** Client ID for tracking (optional) */
  clientId?: string;
}

/** Returns the versioned API base path, e.g. "https://host/api/v1" */
export function getApiBasePath(config: KyvshieldConfig): string {
  const version = config.apiVersion ?? 'v1';
  return `${config.baseUrl}/api/${version}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// Flow configuration
// ═════════════════════════════════════════════════════════════════════════════

/** Flow configuration — which steps to include + UI options */
export interface KyvshieldFlowConfig {
  /** Capture steps in order (default: [selfie, recto, verso]) */
  steps?: CaptureStep[];
  /** UI language code (default: 'fr') */
  language?: string;
  /** Default challenge mode (default: standard) */
  challengeMode?: ChallengeMode;
  /** Per-step challenge modes (overrides default challengeMode) */
  stepChallengeModes?: Partial<Record<CaptureStep, ChallengeMode>>;
  /** Display mode for selfie screen (default: standard) */
  selfieDisplayMode?: SelfieDisplayMode;
  /** Display mode for document capture screen (default: standard) */
  documentDisplayMode?: DocumentDisplayMode;
  /** Show intro page explaining the verification steps (default: true) */
  showIntroPage?: boolean;
  /** Show instruction pages before each capture step (default: true) */
  showInstructionPages?: boolean;
  /** Show result page at the end with verification summary (default: true) */
  showResultPage?: boolean;
  /** Show success animation after each step completes (default: true) */
  showSuccessPerStep?: boolean;
  /** Require face match — selfie vs document photo (default: true when selfie+recto) */
  requireFaceMatch?: boolean;
  /** Require AML (Anti-Money Laundering) sanctions screening (default: false) */
  requireAml?: boolean;
  /** Play audio instructions for each challenge (default: false) */
  playChallengeAudio?: boolean;
  /** How many times to play the challenge audio instruction (default: once) */
  maxChallengeAudioPlay?: ChallengeAudioRepeat;
  /** Pause duration in ms between audio repetitions (default: 1000) */
  pauseBetweenAudioPlayMs?: number;
  /** Target document type (optional — for pre-selection) */
  target?: KyvshieldDocument;
  /** Pass-through identifier for webhook correlation */
  kycIdentifier?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// Flow presets — mirrors Flutter's named constructors exactly
// ═════════════════════════════════════════════════════════════════════════════

export const FlowPresets = {
  /** Selfie only — identity verification without document */
  selfieOnly(
    target?: KyvshieldDocument,
    language: string = 'fr',
  ): KyvshieldFlowConfig {
    return {
      steps: [CaptureStep.selfie],
      language,
      target,
      challengeMode: ChallengeMode.standard,
      selfieDisplayMode: SelfieDisplayMode.standard,
      documentDisplayMode: DocumentDisplayMode.standard,
      requireFaceMatch: false,
      requireAml: false,
      showIntroPage: true,
      showInstructionPages: true,
      showResultPage: true,
      showSuccessPerStep: true,
      playChallengeAudio: false,
      maxChallengeAudioPlay: ChallengeAudioRepeat.once,
      pauseBetweenAudioPlayMs: 1000,
    };
  },

  /** Recto only — document front, no selfie or verso */
  rectoOnly(
    target?: KyvshieldDocument,
    language: string = 'fr',
  ): KyvshieldFlowConfig {
    return {
      steps: [CaptureStep.recto],
      language,
      target,
      challengeMode: ChallengeMode.standard,
      selfieDisplayMode: SelfieDisplayMode.standard,
      documentDisplayMode: DocumentDisplayMode.standard,
      requireFaceMatch: false,
      requireAml: false,
      showIntroPage: true,
      showInstructionPages: true,
      showResultPage: true,
      showSuccessPerStep: true,
      playChallengeAudio: false,
      maxChallengeAudioPlay: ChallengeAudioRepeat.once,
      pauseBetweenAudioPlayMs: 1000,
    };
  },

  /** Document only — recto + verso, no selfie */
  documentOnly(
    target?: KyvshieldDocument,
    language: string = 'fr',
  ): KyvshieldFlowConfig {
    return {
      steps: [CaptureStep.recto, CaptureStep.verso],
      language,
      target,
      challengeMode: ChallengeMode.standard,
      selfieDisplayMode: SelfieDisplayMode.standard,
      documentDisplayMode: DocumentDisplayMode.standard,
      requireFaceMatch: false,
      requireAml: false,
      showIntroPage: true,
      showInstructionPages: true,
      showResultPage: true,
      showSuccessPerStep: true,
      playChallengeAudio: false,
      maxChallengeAudioPlay: ChallengeAudioRepeat.once,
      pauseBetweenAudioPlayMs: 1000,
    };
  },

  /** Standard — selfie + recto (recommended flow) */
  standard(
    target?: KyvshieldDocument,
    language: string = 'fr',
  ): KyvshieldFlowConfig {
    return {
      steps: [CaptureStep.selfie, CaptureStep.recto],
      language,
      target,
      challengeMode: ChallengeMode.standard,
      selfieDisplayMode: SelfieDisplayMode.standard,
      documentDisplayMode: DocumentDisplayMode.standard,
      requireFaceMatch: true,
      requireAml: false,
      showIntroPage: true,
      showInstructionPages: true,
      showResultPage: true,
      showSuccessPerStep: true,
      playChallengeAudio: false,
      maxChallengeAudioPlay: ChallengeAudioRepeat.once,
      pauseBetweenAudioPlayMs: 1000,
    };
  },

  /** Full — selfie + recto + verso + face match */
  full(
    target?: KyvshieldDocument,
    language: string = 'fr',
  ): KyvshieldFlowConfig {
    return {
      steps: [CaptureStep.selfie, CaptureStep.recto, CaptureStep.verso],
      language,
      target,
      challengeMode: ChallengeMode.standard,
      selfieDisplayMode: SelfieDisplayMode.standard,
      documentDisplayMode: DocumentDisplayMode.standard,
      requireFaceMatch: true,
      requireAml: false,
      showIntroPage: true,
      showInstructionPages: true,
      showResultPage: true,
      showSuccessPerStep: true,
      playChallengeAudio: false,
      maxChallengeAudioPlay: ChallengeAudioRepeat.once,
      pauseBetweenAudioPlayMs: 1000,
    };
  },

  /** Quick — selfie + recto, no UI pages, minimal challenges */
  quick(
    target?: KyvshieldDocument,
    language: string = 'fr',
  ): KyvshieldFlowConfig {
    return {
      steps: [CaptureStep.selfie, CaptureStep.recto],
      language,
      target,
      challengeMode: ChallengeMode.minimal,
      selfieDisplayMode: SelfieDisplayMode.compact,
      documentDisplayMode: DocumentDisplayMode.compact,
      requireFaceMatch: true,
      requireAml: false,
      showIntroPage: false,
      showInstructionPages: false,
      showResultPage: false,
      showSuccessPerStep: false,
      playChallengeAudio: false,
      maxChallengeAudioPlay: ChallengeAudioRepeat.once,
      pauseBetweenAudioPlayMs: 1000,
    };
  },

  /** Strict — full capture, maximum security challenges */
  strict(
    target?: KyvshieldDocument,
    language: string = 'fr',
  ): KyvshieldFlowConfig {
    return {
      steps: [CaptureStep.selfie, CaptureStep.recto, CaptureStep.verso],
      language,
      target,
      challengeMode: ChallengeMode.strict,
      selfieDisplayMode: SelfieDisplayMode.standard,
      documentDisplayMode: DocumentDisplayMode.standard,
      requireFaceMatch: true,
      requireAml: false,
      showIntroPage: true,
      showInstructionPages: true,
      showResultPage: true,
      showSuccessPerStep: true,
      playChallengeAudio: false,
      maxChallengeAudioPlay: ChallengeAudioRepeat.once,
      pauseBetweenAudioPlayMs: 1000,
    };
  },

  /** Minimal — full capture, no UI pages, minimal challenges */
  minimal(
    target?: KyvshieldDocument,
    language: string = 'fr',
  ): KyvshieldFlowConfig {
    return {
      steps: [CaptureStep.selfie, CaptureStep.recto, CaptureStep.verso],
      language,
      target,
      challengeMode: ChallengeMode.minimal,
      selfieDisplayMode: SelfieDisplayMode.compact,
      documentDisplayMode: DocumentDisplayMode.compact,
      requireFaceMatch: true,
      requireAml: false,
      showIntroPage: false,
      showInstructionPages: false,
      showResultPage: false,
      showSuccessPerStep: false,
      playChallengeAudio: false,
      maxChallengeAudioPlay: ChallengeAudioRepeat.once,
      pauseBetweenAudioPlayMs: 1000,
    };
  },
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// Internal helpers — serialize config/flow for the JS bridge HTML
// ═════════════════════════════════════════════════════════════════════════════

/** Serialize KyvshieldConfig to the JSON object passed to KyvShield.initKyc() */
export function serializeConfig(cfg: KyvshieldConfig): Record<string, any> {
  const obj: Record<string, any> = {
    baseUrl:        cfg.baseUrl,
    apiKey:         cfg.apiKey,
    apiVersion:     cfg.apiVersion ?? 'v1',
    enableLog:      cfg.enableLog ?? false,
    timeoutSeconds: cfg.timeoutSeconds ?? 60,
  };

  if (cfg.theme) {
    const t = cfg.theme;
    const themeMap: Record<string, any> = {};
    if (t.primaryColor)   themeMap['primaryColor'] = t.primaryColor;
    if (t.successColor)   themeMap['successColor'] = t.successColor;
    if (t.warningColor)   themeMap['warningColor'] = t.warningColor;
    if (t.errorColor)     themeMap['errorColor']   = t.errorColor;
    if (t.darkMode !== undefined) {
      themeMap['themeMode'] = t.darkMode ? 'dark' : 'light';
    }
    if (Object.keys(themeMap).length > 0) obj['theme'] = themeMap;
  }

  if (cfg.clientId) obj['clientId'] = cfg.clientId;

  return obj;
}

/** Serialize KyvshieldFlowConfig to the JSON object passed to KyvShield.initKyc() */
export function serializeFlow(flow: KyvshieldFlowConfig): Record<string, any> {
  const steps   = flow.steps   ?? [CaptureStep.selfie, CaptureStep.recto, CaptureStep.verso];
  const chMode  = flow.challengeMode ?? ChallengeMode.standard;
  const scModes = flow.stepChallengeModes ?? {};

  const obj: Record<string, any> = {
    steps:                 steps,
    challengeMode:         chMode,
    language:              flow.language              ?? 'fr',
    showIntroPage:         flow.showIntroPage         ?? true,
    showInstructionPages:  flow.showInstructionPages  ?? true,
    showResultPage:        flow.showResultPage        ?? true,
    showSuccessPerStep:    flow.showSuccessPerStep     ?? true,
    requireFaceMatch:      flow.requireFaceMatch      ?? true,
    requireAml:            flow.requireAml            ?? false,
    playChallengeAudio:    flow.playChallengeAudio    ?? false,
    maxChallengeAudioPlay: challengeAudioRepeatCount(
      flow.maxChallengeAudioPlay ?? ChallengeAudioRepeat.once
    ),
    pauseBetweenAudioPlay: flow.pauseBetweenAudioPlayMs ?? 1000,
    selfieDisplayMode:     flow.selfieDisplayMode     ?? SelfieDisplayMode.standard,
    documentDisplayMode:   flow.documentDisplayMode   ?? DocumentDisplayMode.standard,
  };

  if (flow.target) {
    // If target already has snake_case keys (raw JSON from API), pass through as-is
    const t = flow.target as any;
    if (t.doc_type) {
      obj['target'] = t;
    } else {
      const sides = flow.target.supportedSides;
      obj['target'] = {
        doc_type:                 flow.target.docType,
        document_category:        flow.target.category        ?? '',
        document_category_label:  flow.target.categoryLabel   ?? '',
        name:                     flow.target.name            ?? '',
        country:                  flow.target.country         ?? '',
        country_name:             flow.target.countryName     ?? '',
        enabled:                  flow.target.enabled         ?? true,
        supported_sides: sides ? {
          has_recto:              sides.hasRecto,
          has_verso:              sides.hasVerso,
          recto_min_char_ocr:     sides.rectoMinCharOcr     ?? 0,
          recto_min_block_ocr:    sides.rectoMinBlockOcr    ?? 0,
          recto_min_char_ocr_web: sides.rectoMinCharOcrWeb  ?? 0,
          recto_min_block_ocr_web:sides.rectoMinBlockOcrWeb ?? 0,
          verso_min_char_ocr:     sides.versoMinCharOcr     ?? 0,
          verso_min_block_ocr:    sides.versoMinBlockOcr    ?? 0,
          verso_min_char_ocr_web: sides.versoMinCharOcrWeb  ?? 0,
          verso_min_block_ocr_web:sides.versoMinBlockOcrWeb ?? 0,
        } : { has_recto: true, has_verso: true },
      };
    }
  }

  if (flow.kycIdentifier) obj['kycIdentifier'] = flow.kycIdentifier;

  if (scModes && Object.keys(scModes).length > 0) {
    const stepModesObj: Record<string, string> = {};
    for (const [step, mode] of Object.entries(scModes)) {
      if (mode) stepModesObj[step] = mode;
    }
    if (Object.keys(stepModesObj).length > 0) obj['stepChallengeModes'] = stepModesObj;
  }

  return obj;
}
