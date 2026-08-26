"use server"

import { randomUUID } from "node:crypto"
import { revalidateTag } from "next/cache"
import { eq, sql } from "drizzle-orm"

import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import { questionCategory } from "@/lib/db/schema"
import {
  questionCategorySchema,
  type QuestionCategoryFormValues,
} from "./category-validation"

export interface QuestionCategoryActionResult {
  ok: true
  id: string
}

export interface QuestionCategoryActionError {
  ok: false
  message: string
}

async function categoryNameTaken(name: string, excludeId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: questionCategory.id })
    .from(questionCategory)
    .where(sql`lower(${questionCategory.name}) = lower(${name})`)
    .limit(1)

  return Boolean(row && row.id !== excludeId)
}

export async function createQuestionCategoryAction(
  values: QuestionCategoryFormValues
): Promise<QuestionCategoryActionResult | QuestionCategoryActionError> {
  await requirePermission(PERMISSIONS.QUESTION_CATEGORIES_CREATE)
  const parsed = questionCategorySchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  }

  if (await categoryNameTaken(parsed.data.name)) {
    return { ok: false, message: "Kategori dengan nama tersebut sudah ada." }
  }

  const [row] = await db
    .insert(questionCategory)
    .values({
      id: randomUUID(),
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning({ id: questionCategory.id })

  revalidateTag(CACHE_TAGS.CATEGORIES, "default")

  return { ok: true, id: row?.id ?? "" }
}

export async function updateQuestionCategoryAction(
  id: string,
  values: QuestionCategoryFormValues
): Promise<QuestionCategoryActionResult | QuestionCategoryActionError> {
  await requirePermission(PERMISSIONS.QUESTION_CATEGORIES_UPDATE)
  const parsed = questionCategorySchema.safeParse(values)

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." }
  }

  if (await categoryNameTaken(parsed.data.name, id)) {
    return { ok: false, message: "Kategori dengan nama tersebut sudah ada." }
  }

  const result = await db
    .update(questionCategory)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      updatedAt: new Date(),
    })
    .where(eq(questionCategory.id, id))
    .returning({ id: questionCategory.id })

  if (result.length === 0) {
    return { ok: false, message: "Kategori tidak ditemukan." }
  }

  revalidateTag(CACHE_TAGS.CATEGORIES, "default")

  return { ok: true, id: result[0]?.id ?? id }
}

export async function deleteQuestionCategoryAction(
  id: string
): Promise<QuestionCategoryActionResult | QuestionCategoryActionError> {
  await requirePermission(PERMISSIONS.QUESTION_CATEGORIES_DELETE)

  try {
    const result = await db
      .delete(questionCategory)
      .where(eq(questionCategory.id, id))
      .returning({ id: questionCategory.id })

    if (result.length === 0) {
      return { ok: false, message: "Kategori tidak ditemukan." }
    }

    revalidateTag(CACHE_TAGS.CATEGORIES, "default")

    return { ok: true, id: result[0]?.id ?? id }
  } catch (error) {
    // FK RESTRICT from question.categoryId: referenced categories cannot be
    // deleted while questions use them.
    if (isForeignKeyViolation(error)) {
      return { ok: false, message: "Kategori sedang digunakan oleh soal." }
    }

    throw error
  }
}

function isForeignKeyViolation(error: unknown): boolean {
  // drizzle wraps the underlying pg error in DrizzleQueryError, so the code
  // may sit on the cause chain rather than on the thrown object itself.
  // RESTRICT violations report 23001, plain FK violations 23503.
  for (let current: unknown = error; current; ) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      ((current as { code?: unknown }).code === "23503" ||
        (current as { code?: unknown }).code === "23001")
    ) {
      return true
    }

    const cause = (current as { cause?: unknown })?.cause

    if (cause === current || cause === undefined) {
      return false
    }

    current = cause
  }

  return false
}
