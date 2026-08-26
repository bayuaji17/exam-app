"use server"

import { randomUUID } from "node:crypto"
import { revalidateTag } from "next/cache"
import { eq } from "drizzle-orm"

import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import { questionBank } from "@/lib/db/schema"
import { ensureUniqueSlug } from "@/lib/slugs"
import { questionBankSlugTaken } from "./queries"
import { questionBankSchema, type QuestionBankFormValues } from "./validation"

export interface QuestionBankActionResult {
  ok: true
}

export interface QuestionBankActionError {
  ok: false
  message: string
}

export async function createQuestionBankAction(
  values: QuestionBankFormValues
): Promise<QuestionBankActionResult | QuestionBankActionError> {
  const { user } = await requirePermission(PERMISSIONS.QUESTION_BANKS_CREATE)
  const parsed = questionBankSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  }

  await db.insert(questionBank).values({
    id: randomUUID(),
    name: parsed.data.name,
    slug: await ensureUniqueSlug(parsed.data.name, questionBankSlugTaken),
    description: parsed.data.description ?? null,
    createdBy: user.id,
  })

  revalidateTag(CACHE_TAGS.DASHBOARD_STATS, "default")

  return { ok: true }
}

export async function updateQuestionBankAction(
  id: string,
  values: QuestionBankFormValues
): Promise<QuestionBankActionResult | QuestionBankActionError> {
  await requirePermission(PERMISSIONS.QUESTION_BANKS_UPDATE)
  const parsed = questionBankSchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  }

  const [existing] = await db
    .select({ archivedAt: questionBank.archivedAt })
    .from(questionBank)
    .where(eq(questionBank.id, id))
    .limit(1)

  if (!existing) {
    return { ok: false, message: "Bank soal tidak ditemukan." }
  }

  // Frozen rule (Q5): archived banks are read-only until restored.
  if (existing.archivedAt) {
    return { ok: false, message: "Bank soal sedang diarsipkan dan tidak dapat diubah." }
  }

  const result = await db
    .update(questionBank)
    .set({
      name: parsed.data.name,
      slug: await ensureUniqueSlug(parsed.data.name, (slug) =>
        questionBankSlugTaken(slug, id)
      ),
      description: parsed.data.description ?? null,
      updatedAt: new Date(),
    })
    .where(eq(questionBank.id, id))
    .returning({ id: questionBank.id })

  if (result.length === 0) {
    return { ok: false, message: "Bank soal tidak ditemukan." }
  }

  return { ok: true }
}
