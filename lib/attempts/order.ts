/**
 * Question ordering for an attempt.
 *
 * The order is snapshotted into the attempt row at start, so later edits to
 * the package cannot change a running attempt. The shuffle is seeded so the
 * logic is deterministic and testable; the seed comes from the attempt id.
 */

/** A tiny deterministic PRNG (mulberry32), for seeded shuffles. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSeed(value: string): number {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(index)) | 0
  }

  return hash >>> 0
}

/**
 * Fisher–Yates shuffle with a deterministic seed. The input array is not
 * mutated.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items]
  const random = mulberry32(hashSeed(seed))

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))

    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result
}

/**
 * The order snapshot for an attempt: shuffled when the package says so,
 * package order otherwise. Always returns a fresh array with every id
 * exactly once.
 */
export function buildQuestionOrder(
  questionIds: readonly string[],
  shuffle: boolean,
  seed: string
): string[] {
  return shuffle ? seededShuffle(questionIds, seed) : [...questionIds]
}
