"use server"

import { randomUUID } from "node:crypto"
import { and, eq, inArray, sql } from "drizzle-orm"

import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { db } from "@/lib/db"
import {
  question,
  questionBank,
  questionMedia,
  questionOption,
} from "@/lib/db/schema"
import {
  collectMediaKeys,
  computeLedgerChanges,
} from "./media-ledger"
import {
  extractQuestionSearchText,
  type QuestionEditPayload,
  type QuestionPayload,
  questionEditPayloadSchema,
  questionPayloadSchema,
  validateQuestionPayload,
} from "./question-validation"

export interface QuestionActionResult {
  ok: true
  questionId: string
}

export interface QuestionActionError {
  ok: false
  message: string
}

/**
 * A server action is an untrusted entry point: authenticate the caller and
 * authorize the permission before touching the database.
 */
async function requireQuestionManager() {
  await requirePermission(PERMISSIONS.QUESTION_BANKS_UPDATE)
}

/**
 * The frozen rule (Q5): content inside an archived bank cannot be created or
 * edited, even before the archive UI lands (ticket 05).
 */
async function assertBankActive(bankId: string): Promise<string | null> {
  const [bank] = await db
    .select({ id: questionBank.id })
    .from(questionBank)
    .where(and(eq(questionBank.id, bankId), sql`${questionBank.archivedAt} is null`))
    .limit(1)

  if (!bank) {
    return "Bank soal tidak ditemukan atau sedang diarsipkan."
  }

  return null
}

function contentError(result: ReturnType<typeof validateQuestionPayload>): string | null {
  if (result.length === 0) {
    return null
  }

  return result[0]?.message ?? "Konten tidak valid."
}

export async function createQuestionAction(
  payload: QuestionPayload
): Promise<QuestionActionResult | QuestionActionError> {
  await requireQuestionManager()

  const parsed = questionPayloadSchema.safeParse(payload)

  if (!parsed.success) {
    return { ok: false, message: "Data soal tidak valid." }
  }

  const type = parsed.data.type
  const content = parsed.data.content as QuestionPayload["content"]
  const options = parsed.data.options as QuestionPayload["options"]

  const policyIssue = contentError(validateQuestionPayload(type, content, options))

  if (policyIssue) {
    return { ok: false, message: policyIssue }
  }

  const bankError = await assertBankActive(parsed.data.bankId)

  if (bankError) {
    return { ok: false, message: bankError }
  }

  const questionId = randomUUID()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(question).values({
        id: questionId,
        bankId: parsed.data.bankId,
        type,
        content: content as unknown as Record<string, unknown>,
        searchText: extractQuestionSearchText(content, options),
        categoryId: parsed.data.categoryId ?? null,
      })

      await insertOptions(tx, questionId, options)
      await syncMediaLedger(tx, questionId, content, options)
    })
  } catch {
    return { ok: false, message: "Gagal menyimpan soal." }
  }

  return { ok: true, questionId }
}

export async function updateQuestionAction(
  id: string,
  payload: QuestionEditPayload
): Promise<QuestionActionResult | QuestionActionError> {
  await requireQuestionManager()

  const parsed = questionEditPayloadSchema.safeParse(payload)

  if (!parsed.success) {
    return { ok: false, message: "Data soal tidak valid." }
  }

  const [existing] = await db
    .select({
      id: question.id,
      bankId: question.bankId,
      type: question.type,
      archivedAt: question.archivedAt,
    })
    .from(question)
    .where(eq(question.id, id))
    .limit(1)

  if (!existing) {
    return { ok: false, message: "Soal tidak ditemukan." }
  }

  // Frozen rule: archived questions are read-only (Q5).
  if (existing.archivedAt) {
    return { ok: false, message: "Soal sedang diarsipkan dan tidak dapat diubah." }
  }

  const bankError = await assertBankActive(existing.bankId)

  if (bankError) {
    return { ok: false, message: bankError }
  }

  // The type is immutable (Q8): it comes from the stored row, never from the
  // payload, and the invariants are enforced against it.
  const content = parsed.data.content as QuestionPayload["content"]
  const options = parsed.data.options as QuestionPayload["options"]

  const policyIssue = contentError(validateQuestionPayload(existing.type, content, options))

  if (policyIssue) {
    return { ok: false, message: policyIssue }
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(question)
        .set({
          content: content as unknown as Record<string, unknown>,
          searchText: extractQuestionSearchText(content, options),
          categoryId: parsed.data.categoryId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(question.id, id))

      await tx.delete(questionOption).where(eq(questionOption.questionId, id))
      await insertOptions(tx, id, options)
      await syncMediaLedger(tx, id, content, options)
    })
  } catch {
    return { ok: false, message: "Gagal menyimpan soal." }
  }

  return { ok: true, questionId: id }
}

async function insertOptions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  questionId: string,
  options: QuestionPayload["options"]
): Promise<void> {
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index]

    await tx.insert(questionOption).values({
      id: randomUUID(),
      questionId,
      content: (option?.content ?? { type: "doc", content: [{ type: "paragraph" }] }) as unknown as Record<string, unknown>,
      position: index,
      isCorrect: option?.isCorrect ?? null,
      score: option?.score != null ? String(option.score) : null,
    })
  }
}

/**
 * Sync the media ledger with the image references embedded in the prompt
 * and every option (Q1): insert rows for keys not yet owned, tombstone rows
 * whose keys disappeared from the content. Runs inside the question save
 * transaction.
 */
async function syncMediaLedger(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  questionId: string,
  content: QuestionPayload["content"],
  options: QuestionPayload["options"]
): Promise<void> {
  const referencedKeys = [
    ...collectMediaKeys(content),
    ...options.flatMap((option) => collectMediaKeys(option?.content ?? null)),
  ]

  const currentRows = await tx
    .select({ id: questionMedia.id, objectKey: questionMedia.objectKey, deletedAt: questionMedia.deletedAt })
    .from(questionMedia)
    .where(eq(questionMedia.questionId, questionId))

  const changes = computeLedgerChanges(currentRows, referencedKeys)

  if (changes.insert.length > 0) {
    await tx.insert(questionMedia).values(
      changes.insert.map((row) => ({
        id: randomUUID(),
        questionId,
        objectKey: row.objectKey,
        mime: "image/webp",
        sizeBytes: 0,
      }))
    )
  }

  if (changes.tombstone.length > 0) {
    await tx
      .update(questionMedia)
      .set({ deletedAt: new Date() })
      .where(inArray(questionMedia.id, changes.tombstone))
  }
}

/**
 * Tombstone every ledger row of a question — wired when a question is
 * deleted (ticket 05). The rows survive (FK SET NULL) so the sweeper can
 * still remove the objects; the question transaction never touches storage.
 */
export async function tombstoneQuestionMedia(questionId: string): Promise<void> {
  await db
    .update(questionMedia)
    .set({ deletedAt: new Date() })
    .where(eq(questionMedia.questionId, questionId))
}
