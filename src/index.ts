/**
 * KyvShield Lite — WebView-based KYC SDK for React Native.
 *
 * Drop-in replacement for native camera-based SDKs. Loads the KyvShield Web
 * SDK from your API server so no assets need to be bundled in your app.
 *
 * ## Quick start
 *
 * ```tsx
 * import React, { useState } from 'react';
 * import { Button, View } from 'react-native';
 * import {
 *   KyvshieldModal,
 *   KyvshieldConfig,
 *   FlowPresets,
 *   KYCResult,
 * } from '@kyvshield/react-native-lite';
 *
 * const config: KyvshieldConfig = {
 *   baseUrl: 'https://kyvshield-naruto.innolinkcloud.com',
 *   apiKey: 'your-api-key',
 * };
 *
 * export default function App() {
 *   const [visible, setVisible] = useState(false);
 *   const [result, setResult]   = useState<KYCResult | null>(null);
 *
 *   const handleResult = (r: KYCResult) => {
 *     setVisible(false);
 *     setResult(r);
 *   };
 *
 *   return (
 *     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
 *       <Button title="Start KYC" onPress={() => setVisible(true)} />
 *       <KyvshieldModal
 *         visible={visible}
 *         config={config}
 *         flow={FlowPresets.full()}
 *         onResult={handleResult}
 *         onDismiss={() => setVisible(false)}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */

// Configuration types & helpers
export * from './config';

// Result types & parsers
export * from './result';

// Core WebView component
export { KyvshieldWebView } from './KyvshieldWebView';
export type { KyvshieldWebViewProps } from './KyvshieldWebView';

// Modal wrapper
export { KyvshieldModal } from './KyvshieldModal';
export type { KyvshieldModalProps } from './KyvshieldModal';

// Permission helpers & utilities
export {
  checkCameraPermission,
  requestCameraPermission,
  isCameraPermissionDenied,
  openSettings,
} from './KyvshieldLite';
