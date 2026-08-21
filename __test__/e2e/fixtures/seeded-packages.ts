import { randomUUID } from "node:crypto"
import nextEnv from "@next/env"
import pg from "pg"

const { loadEnvConfig } = nextEnv

export const SEEDED_PACKAGE_PREFIX = "E2E Seeded Package"

function databaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  return url
}

/**
 * Delete every package these tests created. Compositions cascade with the
 * package (see global-teardown.ts for the fullyParallel note).
 */
export async function deleteSeededExamPackages(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query('delete from "exam_package" where "name" like $1', [
      `${SEEDED_PACKAGE_PREFIX}%`,
    ])
  } finally {
    await pool.end()
  }
}

export async function seedExamPackage(
  name: string,
  options: { passScore?: string | null } = {}
): Promise<string> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })
  const client = await pool.connect()

  const id = randomUUID()

  try {
    await client.query("begin")

    await client.query(
      'insert into "exam_package" ("id", "name", "slug", "passScore") values ($1, $2, $3, $4)',
      [id, name, `pkg-${id}`, options.passScore ?? null]
    )

    await client.query("commit")

    return id
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    await client.release()
    await pool.end()
  }
}

export async function seedPackageQuestion(
  examId: string,
  questionId: string,
  position: number
): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })
  const client = await pool.connect()

  try {
    await client.query("begin")

    await client.query(
      'insert into "exam_question" ("id", "examId", "questionId", "position") values ($1, $2, $3, $4)',
      [randomUUID(), examId, questionId, position]
    )

    await client.query("commit")
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    await client.release()
    await pool.end()
  }
}

export async function packagePositions(
  examId: string
): Promise<Array<{ questionId: string; position: number }>> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query<{ questionId: string; position: number }>(
      'select "questionId", "position" from "exam_question" where "examId" = $1 order by "position" asc',
      [examId]
    )

    return result.rows
  } finally {
    await pool.end()
  }
}

export async function packageQuestionScores(
  examId: string
): Promise<Array<{ questionId: string; score: string | null }>> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query<{ questionId: string; score: string | null }>(
      'select "questionId", "score" from "exam_question" where "examId" = $1 order by "position" asc',
      [examId]
    )

    return result.rows
  } finally {
    await pool.end()
  }
}
