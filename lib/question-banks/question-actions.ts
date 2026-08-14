"use server"

import { randomUUID } from "node:crypto"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq, sql } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import { question, questionBank, questionOption } from "@/lib/db/schema"
import {
  extractQuestionSearchText,
  type QuestionEditPayload,
  type QuestionPayload,
  questionEditPayloadSchema,
  questionPayloadSchema,
  validateQuestionPayload,
} from "./question-validation"

const QUESTION_BANKS_PATH = "/dashboard/question-banks"

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
 * authorize the route before touching the database, then re-validate the
 * payload even though the client already ran the same checks.
 */
async function requireQuestionManager() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, QUESTION_BANKS_PATH)) {
    redirect("/dashboard/forbidden")
  }
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
