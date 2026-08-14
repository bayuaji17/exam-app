import { randomUUID } from "node:crypto"
import nextEnv from "@next/env"
import pg from "pg"

const { loadEnvConfig } = nextEnv

/**
 * Marks every question these tests seed, so cleanup can find them. Questions
 * belong to seeded banks (which carry the SEEDED_BANK_PREFIX), and the FK
 * from question -> question_bank is RESTRICT, so the teardown must delete
 * questions before it deletes the banks.
 */
export const SEEDED_QUESTION_PREFIX = "E2E Seeded Question"

interface SeededOption {
  content: Record<string, unknown>
  isCorrect?: boolean
  score?: string
}

export interface SeededQuestion {
  id: string
  bankId: string
}

function databaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  return url
}

export async function deleteSeededQuestions(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    // Every question in a seeded bank — the searchText prefix only marks
    // direct seeds; questions created through the UI belong to seeded banks
    // and must be removed first (the question -> bank FK is RESTRICT).
    await pool.query(
      'delete from "question" where "bankId" in (select "id" from "question_bank" where "name" like $1)',
      ["E2E Seeded Bank%"]
    )
  } finally {
    await pool.end()
  }
}

/**
 * Insert a question (and its options) directly, skipping the UI, for edit
 * and freeze tests that need precise preconditions.
 */
export async function seedQuestion(
  bankId: string,
  input: {
    type: "single" | "scored" | "manual"
    content: Record<string, unknown>
    options?: SeededOption[]
    searchText?: string
    categoryId?: string
    archivedAt?: Date | null
    archivedWithBankAt?: Date | null
  }
): Promise<SeededQuestion> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })
  const client = await pool.connect()

  const id = randomUUID()
  const searchText =
    input.searchText ??
    `${SEEDED_QUESTION_PREFIX} ${input.type} ${randomUUID().slice(0, 8)}`

  try {
    await client.query("begin")

    await client.query(
      `insert into "question" ("id", "bankId", "type", "content", "searchText", "categoryId", "archivedAt", "archivedWithBankAt")
       values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)`,
      [
        id,
        bankId,
        input.type,
        JSON.stringify(input.content),
        searchText,
        input.categoryId ?? null,
        input.archivedAt ?? null,
        input.archivedWithBankAt ?? null,
      ]
    )

    for (let index = 0; index < (input.options?.length ?? 0); index += 1) {
      const option = input.options![index]!

      await client.query(
        `insert into "question_option" ("id", "questionId", "content", "position", "isCorrect", "score")
         values ($1, $2, $3::jsonb, $4, $5, $6)`,
        [
          randomUUID(),
          id,
          JSON.stringify(option.content),
          index,
          option.isCorrect ?? null,
          option.score ?? null,
        ]
      )
    }

    await client.query("commit")

    return { id, bankId }
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    await client.release()
    await pool.end()
  }
}
