import nextEnv from "@next/env"
import ExcelJS from "exceljs"
import pg from "pg"

const { loadEnvConfig } = nextEnv

function databaseUrl(): string {
  loadEnvConfig(process.cwd())

  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  return url
}

/**
 * Remove every import-history row the tests created (the action names them
 * `import-<timestamp>.xlsx`).
 */
export async function deleteSeededImports(): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    await pool.query('delete from "participant_import" where "fileName" like $1', [
      "import-%",
    ])
  } finally {
    await pool.end()
  }
}

/**
 * How many import-history rows exist for a file name pattern.
 */
export async function importHistoryCount(pattern: string): Promise<number> {
  const pool = new pg.Pool({ connectionString: databaseUrl() })

  try {
    const result = await pool.query<{ count: string }>(
      'select count(*)::text as "count" from "participant_import" where "fileName" like $1',
      [pattern]
    )

    return Number(result.rows[0]?.count ?? 0)
  } finally {
    await pool.end()
  }
}

export interface ImportFileRow {
  name: string
  email: string
  username?: string
  nisn: number
  nis?: string
  password?: string
  groups?: string
}

/**
 * Build an .xlsx buffer for the import form, matching the template headers.
 */
export async function buildImportWorkbook(rows: ImportFileRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Peserta")

  sheet.columns = [
    { header: "Nama", key: "name", width: 28 },
    { header: "Email", key: "email", width: 34 },
    { header: "Username", key: "username", width: 20 },
    { header: "NISN", key: "nisn", width: 14 },
    { header: "NIS", key: "nis", width: 16 },
    { header: "Kata Sandi", key: "password", width: 20 },
    { header: "Grup", key: "groups", width: 30 },
  ]

  for (const row of rows) {
    sheet.addRow({
      name: row.name,
      email: row.email,
      username: row.username ?? "",
      nisn: row.nisn,
      nis: row.nis ?? "",
      password: row.password ?? "",
      groups: row.groups ?? "",
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()

  return Buffer.from(buffer)
}

/** The file shape Playwright's setInputFiles expects. */
export function importFile(
  fileName: string,
  buffer: Buffer
): { name: string; mimeType: string; buffer: Buffer } {
  return {
    name: fileName,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  }
}
