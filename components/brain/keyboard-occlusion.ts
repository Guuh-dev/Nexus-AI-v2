export type KeyboardOcclusionInput = {
  keyboardHeight: number;
  baselineHeight: number;
  viewportHeight: number;
};

/**
 * Android launchers/ROMs do not all honour adjustResize the same way.
 * Only compensate for the part of the IME that the native window did not
 * already remove. This avoids both a covered composer and double-resize gaps.
 */
export function resolveKeyboardOcclusion({
  keyboardHeight,
  baselineHeight,
  viewportHeight,
}: KeyboardOcclusionInput): number {
  if (keyboardHeight <= 0 || baselineHeight <= 0 || viewportHeight <= 0) return 0;
  const nativeResize = Math.max(0, baselineHeight - viewportHeight);
  return Math.max(0, Math.round(keyboardHeight - nativeResize));
}
