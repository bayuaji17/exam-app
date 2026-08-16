/**
 * Schedule-window rules, as pure functions.
 *
 * Windows are half-open: a window ending exactly when another starts does
 * not overlap (`[start, end)`).
 */

/**
 * Whether two windows overlap. Null-safe for the derived cases: no duration
 * or missing end means no restriction, so it never conflicts.
 */
export function windowsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart < bEnd && bStart < aEnd
}
