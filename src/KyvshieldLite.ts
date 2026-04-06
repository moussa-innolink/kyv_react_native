/**
 * KyvShield Lite — permission helpers and public SDK utilities.
 *
 * These functions mirror the static methods on the Flutter `Kyvshield` class.
 * Camera permission handling uses `react-native-permissions`.
 *
 * ## Usage
 *
 * ```ts
 * import { requestCameraPermission } from '@kyvshield/react-native-lite';
 *
 * const granted = await requestCameraPermission();
 * if (!granted) {
 *   const denied = await isCameraPermissionDenied();
 *   if (denied) openSettings();
 * }
 * ```
 */

import { Platform, Linking } from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings as rnOpenSettings,
} from 'react-native-permissions';

// ─────────────────────────────────────────────────────────────────────────────
// Platform-specific camera permission key
// ─────────────────────────────────────────────────────────────────────────────

function _getCameraPermission() {
  if (Platform.OS === 'ios') return PERMISSIONS.IOS.CAMERA;
  if (Platform.OS === 'android') return PERMISSIONS.ANDROID.CAMERA;
  throw new Error(`[KyvShieldLite] Unsupported platform: ${Platform.OS}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether camera permission is currently granted.
 *
 * Does NOT trigger a system dialog — use `requestCameraPermission` for that.
 *
 * @returns `true` if camera access is granted.
 */
export async function checkCameraPermission(): Promise<boolean> {
  try {
    const result = await check(_getCameraPermission());
    return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
  } catch {
    return false;
  }
}

/**
 * Request camera permission from the OS.
 *
 * If already granted, returns `true` immediately without showing a dialog.
 * Call this before presenting the `KyvshieldWebView` for a smoother UX.
 * The WebView also handles permissions internally via its own prompt.
 *
 * @returns `true` if camera access is granted after the request.
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const result = await request(_getCameraPermission());
    return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
  } catch {
    return false;
  }
}

/**
 * Whether camera permission is permanently denied (user must go to settings).
 *
 * On iOS this corresponds to `denied` (the system permission was refused and
 * the dialog will not appear again). On Android it corresponds to
 * `never_ask_again`.
 *
 * @returns `true` if the user must open Settings to enable camera access.
 */
export async function isCameraPermissionDenied(): Promise<boolean> {
  try {
    const result = await check(_getCameraPermission());
    return result === RESULTS.DENIED || result === RESULTS.BLOCKED;
  } catch {
    return false;
  }
}

/**
 * Open the app's system settings page so the user can manually enable camera
 * access. Useful when `isCameraPermissionDenied()` returns `true`.
 */
export function openSettings(): void {
  rnOpenSettings().catch(() => {
    // Fallback: open generic settings on Android
    if (Platform.OS === 'android') {
      Linking.openSettings().catch(() => {});
    }
  });
}
