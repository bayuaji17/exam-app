import type { TipTapDoc, TipTapNode } from "@/lib/content-policy"

/**
 * The media ledger (Q1, ADR-0003): content JSON holds the media references,
 * `question_media` holds ownership and lifecycle. On save the ledger is
 * synced with the references embedded in the content — new keys registered,
 * removed keys tombstoned, in the same transaction as the content write.
 */

export interface LedgerRow {
  id: string
  objectKey: string
  deletedAt: Date | null
}

export interface LedgerChange {
  insert: Array<{ objectKey: string }>
  tombstone: string[]
}

/**
 * Collect every image src embedded in a document (the prompt or one option).
 */
export function collectMediaKeys(doc: TipTapDoc | null): string[] {
  const keys: string[] = []

  collect(doc, keys)

  return keys
}

function collect(node: TipTapNode | TipTapDoc | null, keys: string[]): void {
  if (!node) {
    return
  }

  if (node.type === "image" && typeof node.attrs?.src === "string") {
    keys.push(node.attrs.src)
  }

  for (const child of node.content ?? []) {
    collect(child, keys)
  }
}

/**
 * The pure diff: which rows to insert and which row ids to tombstone so the
 * ledger matches the referenced keys. Content is the reference source of
 * truth; the ledger is the ownership record (locked boundary).
 */
export function computeLedgerChanges(
  currentRows: LedgerRow[],
  referencedKeys: string[]
): LedgerChange {
  const referenced = new Set(referencedKeys)
  const insert: LedgerChange["insert"] = []
  const inserted = new Set<string>()

  for (const key of referencedKeys) {
    if (inserted.has(key)) {
      continue
    }

    const existing = currentRows.find(
      (row) => row.objectKey === key && row.deletedAt === null
    )

    if (!existing) {
      insert.push({ objectKey: key })
      inserted.add(key)
    }
  }

  const tombstone = currentRows
    .filter((row) => row.deletedAt === null && !referenced.has(row.objectKey))
    .map((row) => row.id)

  return { insert, tombstone }
}
