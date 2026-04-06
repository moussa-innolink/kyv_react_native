import React from 'react';
import { Modal, StatusBar, StyleSheet, View } from 'react-native';

import { KyvshieldWebView } from './KyvshieldWebView';
import type { KyvshieldConfig, KyvshieldFlowConfig } from './config';
import type { KYCResult } from './result';
import { createErrorResult } from './result';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface KyvshieldModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** SDK configuration */
  config: KyvshieldConfig;
  /** Flow configuration (optional — defaults to full flow) */
  flow?: KyvshieldFlowConfig;
  /**
   * Called when the KYC session completes (success or error).
   * The modal does NOT auto-dismiss — set `visible={false}` in this callback.
   */
  onResult: (result: KYCResult) => void;
  /** Called when the user dismisses the modal (back button / swipe down). */
  onDismiss: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// KyvshieldModal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full-screen modal wrapper around `KyvshieldWebView`.
 *
 * Presents the KYC flow as a slide-up full-screen modal. The caller is
 * responsible for hiding the modal by setting `visible={false}` inside
 * the `onResult` callback.
 *
 * ## Example
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
 *
 *   const handleResult = (result: KYCResult) => {
 *     setVisible(false);
 *     console.log('KYC result:', result.success, result.overallStatus);
 *   };
 *
 *   return (
 *     <View>
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
export const KyvshieldModal: React.FC<KyvshieldModalProps> = ({
  visible,
  config,
  flow,
  onResult,
  onDismiss,
}) => {
  const isDark    = config.theme?.darkMode === true;
  const bgColor   = isDark ? '#0F172A' : '#FFFFFF';
  const barStyle  = isDark ? 'light-content' : 'dark-content';

  const handleResult = React.useCallback(
    (result: KYCResult) => {
      onResult(result);
    },
    [onResult],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
      onRequestClose={() => {
        // Android back button → return error result (matches Flutter behavior)
        onResult(createErrorResult('User cancelled'));
        onDismiss();
      }}
    >
      <StatusBar barStyle={barStyle} backgroundColor={bgColor} />
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <KyvshieldWebView
          config={config}
          flow={flow}
          onResult={handleResult}
          onDismiss={onDismiss}
          style={styles.webView}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
});
