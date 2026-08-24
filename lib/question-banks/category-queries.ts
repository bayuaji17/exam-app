import { eq, sql } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { CACHE_TAGS } from "@/lib/cache-tags"
import { db } from "@/lib/db"
import { questionCategory } from "@/lib/db/schema"

export interface QuestionCategoryListItem {
  id: string
  name: string
  description: string | null
  createdAt: Date
}

const LIST_PROJECTION = {
  id: questionCategory.id,
  name: questionCategory.name,
  description: questionCategory.description,
  createdAt: questionCategory.createdAt,
}

/**
 * All categories, name-first — the option list the question form's combobox
 * consumes (inline-create-ready: the form only needs this plus the action).
 */
export async function listCategories(): Promise<QuestionCategoryListItem[]> {
  "use cache"
  cacheTag(CACHE_TAGS.CATEGORIES)
  cacheLife("days")

  return db
    .select(LIST_PROJECTION)
    .from(questionCategory)
    .orderBy(sql`lower(${questionCategory.name}) asc`)
}

export async function getCategoryById(
  id: string
): Promise<QuestionCategoryListItem | null> {
  "use cache"
  cacheTag(CACHE_TAGS.CATEGORIES)
  cacheLife("days")

  const [row] = await db
    .select(LIST_PROJECTION)
    .from(questionCategory)
    .where(eq(questionCategory.id, id))
    .limit(1)

  return row ?? null
}
