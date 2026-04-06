import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
  Text,
  Easing,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import type { KyvshieldConfig, KyvshieldFlowConfig } from './config';
import { serializeConfig, serializeFlow } from './config';
import type { KYCResult } from './result';
import { parseKYCResultFromString, createErrorResult } from './result';

// Version of the KyvShield Web SDK to load from the server.
const SDK_VERSION = '0.0.4';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface KyvshieldWebViewProps {
  config: KyvshieldConfig;
  flow?: KyvshieldFlowConfig;
  onResult: (result: KYCResult) => void;
  onDismiss?: () => void;
  /** Style override for the outer container */
  style?: object;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML builder — identical to Flutter's _buildHtml()
// ─────────────────────────────────────────────────────────────────────────────

function buildHtml(cfg: KyvshieldConfig, flow: KyvshieldFlowConfig): string {
  const sdkConfig = serializeConfig(cfg);
  const sdkFlow   = serializeFlow(flow);
  const language  = flow.language ?? 'fr';
  const configJson = JSON.stringify(sdkConfig);
  const flowJson   = JSON.stringify(sdkFlow);
  const sdkUrl     = `${cfg.baseUrl}/static/sdk/kyvshield.min.js`;
  const isDark     = cfg.theme?.darkMode === true;
  const htmlBg     = isDark ? '#0F172A' : '#FFFFFF';
  const spinnerTrack = isDark ? '#334155' : '#F1F5F9';
  const primaryHex = cfg.theme?.primaryColor ?? '#EF8352';

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>KyvShield KYC</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: ${htmlBg}; overflow: hidden; }
    #kyc-root { width: 100%; height: 100%; }
    /* HTML loading spinner — shown until SDK JS mounts its UI */
    #html-loading {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: ${htmlBg};
      z-index: 9999;
      gap: 16px;
    }
    .html-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid ${spinnerTrack};
      border-top-color: #EF8352;
      border-radius: 50%;
      animation: html-spin 0.8s linear infinite;
    }
    @keyframes html-spin { to { transform: rotate(360deg); } }
    .html-loading-text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      color: ${primaryHex};
    }
    #error-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: #0D0D0D;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 16px;
      padding: 32px;
      text-align: center;
      z-index: 9998;
    }
    #error-overlay.visible { display: flex; }
    #error-msg { color: #EF4444; font-size: 14px; word-break: break-word; }
    #retry-btn {
      padding: 12px 24px;
      background: #EF8352;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="html-loading">
    <div class="html-spinner"></div>
    <span class="html-loading-text">Chargement\u2026</span>
  </div>

  <div id="error-overlay">
    <p>Une erreur est survenue.</p>
    <p id="error-msg"></p>
    <button id="retry-btn" onclick="location.reload()">R\u00e9essayer</button>
  </div>

  <div id="kyc-root"></div>

  <script src="${sdkUrl}" onerror="onSdkLoadError()"></script>

  <script>
    // ── Uint8Array → base64 conversion ──
    // JSON.stringify(Uint8Array) produces {"0":255,"1":216,...} which is ~10x
    // larger than base64. This helper recursively converts all Uint8Array and
    // ArrayBuffer values to base64 strings before serialisation.
    function _u8ToB64(u8) {
      var bin = '';
      var len = u8.length;
      for (var i = 0; i < len; i++) bin += String.fromCharCode(u8[i]);
      return btoa(bin);
    }
    function _prepareForBridge(obj) {
      if (obj === null || obj === undefined) return obj;
      if (obj instanceof Uint8Array) return _u8ToB64(obj);
      if (obj instanceof ArrayBuffer) return _u8ToB64(new Uint8Array(obj));
      if (Array.isArray(obj)) return obj.map(_prepareForBridge);
      if (typeof obj === 'object' && obj.constructor === Object) {
        var out = {};
        for (var k in obj) {
          if (obj.hasOwnProperty(k)) out[k] = _prepareForBridge(obj[k]);
        }
        return out;
      }
      return obj;
    }

    // ── Bridge setup ──
    // In React Native, window.ReactNativeWebView.postMessage is injected by
    // the WebView before content loads. We wrap it in a KyvShieldBridge
    // object that matches the Flutter channel API so the SDK JS code works
    // identically on both platforms.
    (function() {
      var _origBridge = window.KyvShieldBridge || {};
      _origBridge.onResult = function(jsonStr) {
        var msg = typeof jsonStr === 'string' ? jsonStr : JSON.stringify(jsonStr);
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(msg);
        } else if (_origBridge.postMessage) {
          _origBridge.postMessage(msg);
        } else {
          console.error('[KyvShieldBridge] postMessage not available');
        }
      };
      window.KyvShieldBridge = _origBridge;
    })();

    function showError(msg) {
      var hl = document.getElementById('html-loading');
      if (hl) hl.style.display = 'none';
      var overlay = document.getElementById('error-overlay');
      overlay.classList.add('visible');
      document.getElementById('error-msg').textContent = msg || '';
      var errPayload = JSON.stringify({
        success: false,
        overall_status: 'ERROR',
        error_message: msg || 'Unknown SDK error'
      });
      try { window.ReactNativeWebView.postMessage(errPayload); } catch(e) {}
    }

    function onSdkLoadError() {
      showError('Impossible de charger le SDK depuis le serveur (${sdkUrl}).');
    }

    // ── Preload model + audio while user reads intro/instructions ──────────
    function preloadResources() {
      try {
        if (typeof KyvShield === 'undefined') return;
        if (KyvShield.FaceLandmarkerService && KyvShield.FaceLandmarkerService.preloadModel) {
          KyvShield.FaceLandmarkerService.preloadModel();
          console.log('[KyvShield] FaceLandmarker model preload initiated');
        }
        if (KyvShield.KyvSoundHelper) {
          KyvShield.KyvSoundHelper.setBasePath('${cfg.baseUrl}/static/sdk/assets/sounds');
          KyvShield.KyvSoundHelper.setChallengeBasePath('${cfg.baseUrl}/static/sdk/assets/challenges');
          KyvShield.KyvSoundHelper.setEnabled(true);
          KyvShield.KyvSoundHelper.preloadChallengeAudio('${language}');
          console.log('[KyvShield] Audio preload initiated (${language})');
        }
      } catch(e) { console.warn('[KyvShield] Preload error:', e); }
    }
    preloadResources();

    async function bootstrapKyc() {
      try {
        if (typeof KyvShield === 'undefined') {
          showError('KyvShield SDK introuvable apr\\u00e8s chargement du script.');
          return;
        }
        // Hide HTML loading spinner — SDK is about to mount
        var htmlLoading = document.getElementById('html-loading');
        if (htmlLoading) htmlLoading.style.display = 'none';

        var config = ${configJson};
        var flow   = ${flowJson};
        var result = await KyvShield.initKyc(config, flow);

        // Convert Uint8Arrays to base64 before JSON.stringify
        // This reduces payload ~10x (130K-key objects → compact base64 strings)
        if (typeof result === 'object' && result !== null) {
          result = _prepareForBridge(result);
        }

        window.KyvShieldBridge.onResult(
          typeof result === 'string' ? result : JSON.stringify(result)
        );
      } catch (err) {
        showError(err && err.message ? err.message : String(err));
      }
    }

    window.addEventListener('load', function() {
      bootstrapKyc();
    });
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading overlay — shield with pulsing rings (mirrors Flutter)
// ─────────────────────────────────────────────────────────────────────────────

interface LoadingOverlayProps {
  primaryColor: string;
  bgColor: string;
  textColor: string;
  pulseAnim: Animated.Value;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  primaryColor,
  bgColor,
  textColor,
  pulseAnim,
}) => {
  // Three staggered ring scale animations
  const ring1Opacity = pulseAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.6, 0.0, 0.6, 0.6],
    extrapolate: 'clamp',
  });
  const ring2Opacity = pulseAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.4, 0.6, 0.0, 0.4],
    extrapolate: 'clamp',
  });
  const ring3Opacity = pulseAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.2, 0.4, 0.6, 0.0],
    extrapolate: 'clamp',
  });

  const ring1Scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.4],
  });
  const ring2Scale = pulseAnim.interpolate({
    inputRange: [0, 0.33, 1],
    outputRange: [0.5, 0.5, 1.4],
  });
  const ring3Scale = pulseAnim.interpolate({
    inputRange: [0, 0.66, 1],
    outputRange: [0.5, 0.5, 1.4],
  });

  // Bouncing dots
  const dot1 = pulseAnim.interpolate({
    inputRange: [0, 0.2, 0.4, 1],
    outputRange: [0.5, 1.0, 0.5, 0.5],
    extrapolate: 'clamp',
  });
  const dot2 = pulseAnim.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 1],
    outputRange: [0.5, 0.5, 1.0, 0.5, 0.5],
    extrapolate: 'clamp',
  });
  const dot3 = pulseAnim.interpolate({
    inputRange: [0, 0.4, 0.6, 0.8, 1],
    outputRange: [0.5, 0.5, 0.5, 1.0, 0.5],
    extrapolate: 'clamp',
  });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }]}>
      {/* Pulsing rings + shield icon */}
      <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center' }}>
        {/* Ring 1 */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 90,
            height: 90,
            borderRadius: 45,
            borderWidth: 2,
            borderColor: primaryColor,
            opacity: ring1Opacity,
            transform: [{ scale: ring1Scale }],
          }}
        />
        {/* Ring 2 */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 70,
            height: 70,
            borderRadius: 35,
            borderWidth: 2,
            borderColor: primaryColor,
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          }}
        />
        {/* Ring 3 */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 50,
            height: 50,
            borderRadius: 25,
            borderWidth: 2,
            borderColor: primaryColor,
            opacity: ring3Opacity,
            transform: [{ scale: ring3Scale }],
          }}
        />
      </View>

      {/* Label */}
      <View style={{ height: 28 }} />
      <Text
        style={{
          color: primaryColor,
          fontSize: 15,
          fontWeight: '500',
          letterSpacing: 0.5,
        }}
      >
        Initialisation…
      </Text>

      {/* Animated dots */}
      <View style={{ height: 16 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: primaryColor,
              marginHorizontal: 3,
              opacity: dot,
              transform: [{ scale: dot }],
            }}
          />
        ))}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KyvshieldWebView component
// ─────────────────────────────────────────────────────────────────────────────

export const KyvshieldWebView: React.FC<KyvshieldWebViewProps> = ({
  config,
  flow = {},
  onResult,
  onDismiss,
  style,
}) => {
  const [pageLoaded, setPageLoaded] = useState(false);
  const resultReceived = useRef(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Resolve theme colors
  const primaryColor = config.theme?.primaryColor ?? '#EF8352';
  const isDark       = config.theme?.darkMode === true;
  const bgColor      = isDark ? '#0F172A' : '#FFFFFF';
  const textColor    = isDark ? '#FFFFFF' : '#757575';

  // Start pulse animation on mount
  React.useEffect(() => {
    pulseLoop.current = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    pulseLoop.current.start();
    return () => {
      pulseLoop.current?.stop();
    };
  }, [pulseAnim]);

  const html = React.useMemo(() => buildHtml(config, flow), [config, flow]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (resultReceived.current) return;
      resultReceived.current = true;

      const raw = event.nativeEvent.data;
      if (config.enableLog) {
        console.log('[KyvShieldLite] Bridge received', raw.length, 'chars');
        console.log('[KyvShieldLite] Preview:', raw.substring(0, 800));
      }

      const result = parseKYCResultFromString(raw);

      if (config.enableLog) {
        console.log('[KyvShieldLite] Parsed: success=', result.success,
          'status=', result.overallStatus,
          'error=', result.errorMessage);
      }

      onResult(result);
    },
    [config.enableLog, onResult],
  );

  const handleLoadEnd = useCallback(() => {
    // Delay 500ms extra so the SDK UI has time to render before removing overlay
    setTimeout(() => {
      setPageLoaded(true);
    }, 500);
  }, []);

  const handleError = useCallback(() => {
    if (!resultReceived.current) {
      resultReceived.current = true;
      onResult(createErrorResult('WebView failed to load'));
    }
  }, [onResult]);

  // Status bar style
  const statusBarStyle = isDark ? 'light-content' : 'dark-content';

  // injectedJavaScriptBeforeContentLoaded sets up the ReactNativeWebView bridge
  // shim so the HTML can safely call window.ReactNativeWebView.postMessage
  // even before the page fully loads.
  const injectedJS = `
    (function() {
      // Ensure ReactNativeWebView exists so SDK JS doesn't crash on reference
      if (!window.ReactNativeWebView) {
        window.ReactNativeWebView = {
          postMessage: function(msg) {
            console.warn('[KyvShield] ReactNativeWebView not ready — message dropped:', msg.substring(0, 100));
          }
        };
      }
      // Pre-create KyvShieldBridge placeholder so SDK can attach onResult early
      if (!window.KyvShieldBridge) window.KyvShieldBridge = {};
    })();
    true;
  `;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }, style]}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={bgColor} />

      <WebView
        style={styles.webview}
        source={{ html, baseUrl: config.baseUrl }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        // iOS: allow camera inside WebView
        allowsAirPlayForMediaPlayback={false}
        // Android: show file selector (no-op for KYC flow)
        onFileDownload={undefined}
        // Messages from JS → RN
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={(e) => {
          if (config.enableLog) {
            console.warn('[KyvShieldLite] HTTP error', e.nativeEvent.statusCode, e.nativeEvent.url);
          }
        }}
        onConsoleMessage={(e) => {
          if (config.enableLog) {
            console.log(`[KyvShieldLite] JS [${e.nativeEvent.level}]:`, e.nativeEvent.message);
          }
        }}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        // User-agent: append KyvShield identifier
        applicationNameForUserAgent="KyvShield/1.0"
        // Android WebView debugging
        {...(Platform.OS === 'android' && config.enableLog
          ? { webviewDebuggingEnabled: true }
          : {})}
      />

      {/* Native loading overlay — shown until page finishes loading */}
      {!pageLoaded && (
        <LoadingOverlay
          primaryColor={primaryColor}
          bgColor={bgColor}
          textColor={textColor}
          pulseAnim={pulseAnim}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
