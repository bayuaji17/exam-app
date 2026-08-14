/**
 * The restore-selection rule (Q5, ADR-0005): a bank restore brings back the
 * questions that were archived as a consequence of that bank archive — their
 * `archivedWithBankAt` matches the bank's `archivedAt` exactly — while
 * questions archived independently stay archived.
 */
export interface ArchiveRow {
  id: string
  archivedWithBankAt: Date | null
}

export function isConsequenceArchive(
  row: ArchiveRow,
  bankArchivedAt: Date
): boolean {
  return (
    row.archivedWithBankAt !== null &&
    row.archivedWithBankAt.getTime() === bankArchivedAt.getTime()
  )
}
