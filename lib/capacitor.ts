/**
 * Platform detection for Capacitor remote URL mode.
 *
 * In remote URL mode the Capacitor JS bridge is not injected,
 * so we detect the native shell via the custom user-agent string
 * appended in capacitor.config.ts.
 */

export function isNativePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.userAgent.includes('LinkPartyCapacitor')
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || isNativePlatform()
}
