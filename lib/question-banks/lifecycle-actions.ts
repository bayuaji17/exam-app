"use server"

import { revalidateTag } from "next/cache"
import { eq, inArray, sql } from "drizzle-orm"

import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import { question, questionBank, questionMedia } from "@/lib/db/schema"
import { isConsequenceArchive } from "./restore-rule"

export interface LifecycleResult {
  ok: true
}

export interface LifecycleError {
  ok: false
  message: string
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function getBankState(id: string): Promise<{ archivedAt: Date | null } | null> {
  const [bank] = await db
    .select({ archivedAt: questionBank.archivedAt })
    .from(questionBank)
    .where(eq(questionBank.id, id))
    .limit(1)

  return bank ?? null
}

/**
 * Archive a bank and, in the same transaction, every currently active
 * question. Consequence-archived questions record `archivedWithBankAt` so a
 * bank restore can tell them apart from independently archived ones (Q5).
 */
export async function archiveQuestionBankAction(
  id: string
): Promise<LifecycleResult | LifecycleError> {
  await requirePermission(PERMISSIONS.QUESTION_BANKS_UPDATE)

  const bank = await getBankState(id)

  if (!bank) {
    return { ok: false, message: "Bank soal tidak ditemukan." }
  }

  if (bank.archivedAt) {
    return { ok: true }
  }

  try {
    await db.transaction(async (tx) => {
      const now = new Date()

      await tx
        .update(questionBank)
        .set({ archivedAt: now, updatedAt: now })
        .where(eq(questionBank.id, id))

      await tx
        .update(question)
        .set({ archivedAt: now, archivedWithBankAt: now, updatedAt: now })
        .where(
          sql`${question.bankId} = ${id} and ${question.archivedAt} is null`
        )
    })
  } catch {
    return { ok: false, message: "Gagal mengarsipkan bank soal." }
  }

  return { ok: true }
}

/**
 * Restore a bank. Questions archived as a consequence of this bank archive
 * (their `archivedWithBankAt` matches the bank's `archivedAt`) come back
 * active; questions archived independently stay archived (Q5).
 */
export async function restoreQuestionBankAction(
  id: string
): Promise<LifecycleResult | LifecycleError> {
  await requirePermission(PERMISSIONS.QUESTION_BANKS_UPDATE)

  const bank = await getBankState(id)

  if (!bank) {
    return { ok: false, message: "Bank soal tidak ditemukan." }
  }

  if (!bank.archivedAt) {
    return { ok: true }
  }

  const bankArchivedAt = bank.archivedAt

  try {
    await db.transaction(async (tx) => {
      // The restore rule is single-sourced in restore-rule.ts: only the
      // questions archived as a consequence of THIS bank archive come back.
      const candidates = await tx
        .select({
          id: question.id,
          archivedWithBankAt: question.archivedWithBankAt,
        })
        .from(question)
        .where(eq(question.bankId, id))

      const toRestore = candidates
        .filter((row) => isConsequenceArchive(row, bankArchivedAt))
        .map((row) => row.id)

      if (toRestore.length > 0) {
        await tx
          .update(question)
          .set({ archivedAt: null, archivedWithBankAt: null, updatedAt: new Date() })
          .where(inArray(question.id, toRestore))
      }

      await tx
        .update(questionBank)
        .set({ archivedAt: null, updatedAt: new Date() })
        .where(eq(questionBank.id, id))
    })
  } catch {
    return { ok: false, message: "Gagal memulihkan bank soal." }
  }

  return { ok: true }
}

/**
 * Delete a bank — terminal, and only available from the archived state.
 * Questions are removed (options cascade) and every media ledger row is
 * tombstoned so the sweeper reclaims the objects.
 */
export async function deleteQuestionBankAction(
  id: string
): Promise<LifecycleResult | LifecycleError> {
  await requirePermission(PERMISSIONS.QUESTION_BANKS_DELETE)

  const bank = await getBankState(id)

  if (!bank) {
    return { ok: false, message: "Bank soal tidak ditemukan." }
  }

  if (!bank.archivedAt) {
    return { ok: false, message: "Arsipkan bank soal sebelum menghapusnya." }
  }

  try {
    await db.transaction(async (tx) => {
      const questionIds = await tx
        .select({ id: question.id })
        .from(question)
        .where(eq(question.bankId, id))

      for (const row of questionIds) {
        await tombstoneMediaFor(tx, row.id)
      }

      if (questionIds.length > 0) {
        await tx
          .delete(question)
          .where(inArray(question.id, questionIds.map((row) => row.id)))
      }

      await tx.delete(questionBank).where(eq(questionBank.id, id))
    })
  } catch {
    return { ok: false, message: "Gagal menghapus bank soal." }
  }

  revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default")

  return { ok: true }
}

async function getQuestionState(id: string): Promise<{ archivedAt: Date | null } | null> {
  const [row] = await db
    .select({ archivedAt: question.archivedAt })
    .from(question)
    .where(eq(question.id, id))
    .limit(1)

  return row ?? null
}

/**
 * Archive a question independently of its bank — never touches
 * `archivedWithBankAt`, so a later bank restore leaves it archived (Q5).
 */
export async function archiveQuestionAction(
  id: string
): Promise<LifecycleResult | LifecycleError> {
  await requirePermission(PERMISSIONS.QUESTION_BANKS_UPDATE)

  const questionState = await getQuestionState(id)

  if (!questionState) {
    return { ok: false, message: "Soal tidak ditemukan." }
  }

  if (questionState.archivedAt) {
    return { ok: true }
  }

  try {
    await db
      .update(question)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(question.id, id))
  } catch {
    return { ok: false, message: "Gagal mengarsipkan soal." }
  }

  return { ok: true }
}

export async function restoreQuestionAction(
  id: string
): Promise<LifecycleResult | LifecycleError> {
  await requirePermission(PERMISSIONS.QUESTION_BANKS_UPDATE)

  const questionState = await getQuestionState(id)

  if (!questionState) {
    return { ok: false, message: "Soal tidak ditemukan." }
  }

  if (!questionState.archivedAt) {
    return { ok: true }
  }

  try {
    await db
      .update(question)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(eq(question.id, id))
  } catch {
    return { ok: false, message: "Gagal memulihkan soal." }
  }

  return { ok: true }
}

/**
 * Delete a question — terminal, only from the archived state. Media ledger
 * rows are tombstoned (they survive via FK SET NULL) so the sweeper removes
 * the objects; options cascade.
 */
export async function deleteQuestionAction(
  id: string
): Promise<LifecycleResult | LifecycleError> {
  await requirePermission(PERMISSIONS.QUESTION_BANKS_UPDATE)

  const questionState = await getQuestionState(id)

  if (!questionState) {
    return { ok: false, message: "Soal tidak ditemukan." }
  }

  if (!questionState.archivedAt) {
    return { ok: false, message: "Arsipkan soal sebelum menghapusnya." }
  }

  try {
    await db.transaction(async (tx) => {
      await tombstoneMediaFor(tx, id)
      await tx.delete(question).where(eq(question.id, id))
    })
  } catch {
    return { ok: false, message: "Gagal menghapus soal." }
  }

  revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default")

  return { ok: true }
}

async function tombstoneMediaFor(tx: Tx, questionId: string): Promise<void> {
  await tx
    .update(questionMedia)
    .set({ deletedAt: new Date() })
    .where(eq(questionMedia.questionId, questionId))
}
