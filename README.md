# KyvShield React Native SDK

**KyvShield** — React Native SDK for identity verification (KYC). Selfie liveness, document OCR, face matching.

## Installation

```bash
npm install @kyvshield/react-native

# Peer dependencies
npm install react-native-webview react-native-permissions
```

For iOS, install pods:

```bash
cd ios && pod install
```

## Full Example

All possible enum values listed. Code is copy-paste ready.

```tsx
import React, { useState } from 'react';
import { Button, View, Alert } from 'react-native';
import {
  KyvshieldModal,
  FlowPresets,
  requestCameraPermission,
  isCameraPermissionDenied,
  openSettings,
  kycResultGetExtractedValue,
} from '@kyvshield/react-native';
import type {
  KyvshieldConfig,
  KyvshieldFlowConfig,
  KyvshieldDocument,
  CaptureStep,
  ChallengeMode,
  SelfieDisplayMode,
  DocumentDisplayMode,
  KYCResult,
} from '@kyvshield/react-native';

// ── Possible values ───────────────────────────────────────────────────
// CaptureStep        : 'selfie', 'recto', 'verso'
// ChallengeMode      : 'minimal', 'standard', 'strict'
// SelfieDisplayMode  : 'standard', 'compact', 'immersive', 'neonHud'
// DocumentDisplayMode: 'standard', 'compact', 'immersive', 'neonHud'
// ChallengeAudioRepeat: 'once', 'twice', 'thrice'

// ── Fetch documents from API ──────────────────────────────────────────

async function fetchDocuments(): Promise<KyvshieldDocument[]> {
  const res = await fetch(
    'https://kyvshield-naruto.innolinkcloud.com/api/v1/documents',
    { headers: { 'X-API-Key': 'YOUR_API_KEY' } },
  );
  const { documents } = await res.json();
  return documents;
}

// ── Config ────────────────────────────────────────────────────────────

const config: KyvshieldConfig = {
  baseUrl: 'https://kyvshield-naruto.innolinkcloud.com',
  apiKey: 'YOUR_API_KEY',
  enableLog: true,
  theme: {
    primaryColor: '#EF8352',
    darkMode: false,
  },
};

// ── Flow ──────────────────────────────────────────────────────────────

const flow: KyvshieldFlowConfig = {
  steps: ['selfie', 'recto', 'verso'] as CaptureStep[],
  language: 'fr',
  showIntroPage: true,
  showInstructionPages: true,
  showResultPage: true,
  showSuccessPerStep: true,
  selfieDisplayMode: 'standard' as SelfieDisplayMode,
  documentDisplayMode: 'standard' as DocumentDisplayMode,
  challengeMode: 'minimal' as ChallengeMode,
  requireFaceMatch: true,
  playChallengeAudio: true,
  maxChallengeAudioPlay: 'once',
  pauseBetweenAudioPlayMs: 1000,
  target: selectedDoc,
  kycIdentifier: 'user-12345',
};

// ── Component ─────────────────────────────────────────────────────────

export default function App() {
  const [visible, setVisible] = useState(false);

  const startKyc = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      const denied = await isCameraPermissionDenied();
      if (denied) openSettings();
      return;
    }
    setVisible(true);
  };

  const handleResult = (result: KYCResult) => {
    setVisible(false);

    console.log('Success:', result.success);
    console.log('Status:', result.overallStatus); // pass, reject, error
    console.log('Session:', result.sessionId);

    // Selfie
    if (result.selfieResult) {
      console.log('Live:', result.selfieResult.isLive);
      console.log('Image:', result.selfieResult.capturedImageBase64?.length, 'chars');
    }

    // Recto
    if (result.rectoResult) {
      console.log('Score:', result.rectoResult.score);
      console.log('Fields:', result.rectoResult.extraction?.fields?.length);
      if (result.rectoResult.faceVerification) {
        console.log('Face match:', result.rectoResult.faceVerification.isMatch);
        console.log('Similarity:', result.rectoResult.faceVerification.similarityScore);
      }
    }

    // Extracted data
    console.log('Nom:', kycResultGetExtractedValue(result, 'nom'));
    console.log('NIN:', kycResultGetExtractedValue(result, 'nin'));
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Start KYC" onPress={startKyc} />
      <KyvshieldModal
        visible={visible}
        config={config}
        flow={flow}
        onResult={handleResult}
        onDismiss={() => setVisible(false)}
      />
    </View>
  );
}
```

## Display Modes

| Mode | Description |
|------|-------------|
| `standard` | Classic layout with header, camera, and instructions below |
| `compact` | Camera fills screen, instructions overlay at bottom |
| `immersive` | Full-screen camera with glass-effect overlays |
| `neonHud` | Futuristic dark theme with glow effects and monospace font |

## Permission Helpers

```ts
import {
  checkCameraPermission,
  requestCameraPermission,
  isCameraPermissionDenied,
  openSettings,
} from '@kyvshield/react-native';

const granted = await requestCameraPermission();  // boolean
const hasAccess = await checkCameraPermission();   // boolean
const denied = await isCameraPermissionDenied();   // boolean
openSettings();                                     // opens app settings
```

Requires `react-native-permissions` as a peer dependency (optional).

## Platform Setup

### iOS

Add camera usage description to `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is required for identity verification.</string>
```

### Android

Add to `AndroidManifest.xml` (usually already present):

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

### React Native requirements

- React Native >= 0.72.0
- react-native-webview >= 13.0.0
- react-native-permissions >= 3.0.0 (optional, for permission helpers)

## API Documentation

Full documentation: **[https://kyvshield-naruto.innolinkcloud.com/developer](https://kyvshield-naruto.innolinkcloud.com/developer)**

## License

MIT License. See [LICENSE](LICENSE).
