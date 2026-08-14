export interface PositionedEntry {
  id: string
  position: number
}

/**
 * The pure swap rule behind a move: the two entries exchange positions.
 * Unit-tested; the transaction applies it atomically. Lives outside the
 * server-action module so it can be a plain function.
 */
export function swapPositions(
  first: PositionedEntry,
  second: PositionedEntry
): { first: PositionedEntry; second: PositionedEntry } {
  return {
    first: { id: first.id, position: second.position },
    second: { id: second.id, position: first.position },
  }
}
