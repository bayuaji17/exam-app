import { randomBytes } from "node:crypto"
import { z } from "zod"

/**
 * The pure core of participant import: row parsing, validation, password
 * generation, and the atomic apply plan. No DB or server-only imports, so
 * the rules are fully unit-testable.
 */

export const IMPORT_MAX_ROWS = 500
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024
export const IMPORT_ALLOWED_EXT = ".xlsx"

export interface ImportRow {
  rowNumber: number
  name: string
  email: string
  username: string | null
  password: string | null
  groupNames: string[]
}

const usernamePattern = /^[a-zA-Z0-9_.]+$/

/**
 * Generate a cryptographically random password (12 characters) for rows that
 * did not provide one. Shown once in the import result, never persisted.
 */
export function generatePassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*"
  const bytes = randomBytes(12)

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")
}

function parseCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  return String(value).trim()
}

/**
 * Parse a worksheet row (1-indexed row number, cell values) into an ImportRow.
 * Cell parsing is lenient; semantic validation happens in validateImportRows.
 */
export function parseImportRow(
  rowNumber: number,
  cells: Record<string, unknown>
): ImportRow {
  const name = parseCell(cells.Nama)
  const email = parseCell(cells.Email).toLowerCase()
  const username = parseCell(cells.Username)
  const password = parseCell(cells["Kata Sandi"])
  const groups = parseCell(cells.Grup)
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean)

  return {
    rowNumber,
    name,
    email,
    username: username || null,
    password: password || null,
    groupNames: groups,
  }
}

export interface RowError {
  rowNumber: number
  message: string
}

/**
 * Validate a row against the template rules. Reuses the account rules from
 * the users module (name/email/password) and the username pattern from the
 * seed script.
 */
export function validateImportRow(
  row: ImportRow,
  knownGroups: Set<string>
): RowError[] {
  const errors: RowError[] = []
  const push = (message: string) => errors.push({ rowNumber: row.rowNumber, message })

  if (!row.name) {
    push("Nama wajib diisi.")
  } else if (row.name.length > 100) {
    push("Nama maksimal 100 karakter.")
  }

  if (!row.email) {
    push("Email wajib diisi.")
  } else if (!z.email().safeParse(row.email).success) {
    push("Email tidak valid.")
  }

  if (row.username !== null) {
    if (row.username.length < 3 || row.username.length > 30) {
      push("Username harus 3–30 karakter.")
    } else if (!usernamePattern.test(row.username)) {
      push("Username hanya boleh huruf, angka, garis bawah, dan titik.")
    }
  }

  if (row.password !== null && row.password.length < 8) {
    push("Kata sandi minimal 8 karakter.")
  }

  for (const group of row.groupNames) {
    if (!knownGroups.has(group.toLowerCase())) {
      push(`Grup "${group}" tidak ditemukan.`)
    }
  }

  return errors
}

export interface ImportPlan {
  rows: ImportRow[]
  errors: RowError[]
  /** True only when every row is valid — the Import button's gate. */
  valid: boolean
}

/**
 * Validate a full batch: per-row rule errors plus batch-level dedupe
 * (email already in the database, or duplicated within the file). All-or-
 * nothing: any error means the plan is not valid.
 */
export function validateImportPlan(
  rows: ImportRow[],
  existingEmails: Set<string>,
  knownGroups: Set<string>
): ImportPlan {
  const errors: RowError[] = []
  const seenEmails = new Set<string>()

  for (const row of rows) {
    const rowErrors = validateImportRow(row, knownGroups)

    if (existingEmails.has(row.email)) {
      rowErrors.push({ rowNumber: row.rowNumber, message: "Email sudah terdaftar." })
    }

    if (seenEmails.has(row.email)) {
      rowErrors.push({ rowNumber: row.rowNumber, message: "Email duplikat di dalam file." })
    }

    seenEmails.add(row.email)
    errors.push(...rowErrors)
  }

  return { rows, errors, valid: errors.length === 0 }
}
