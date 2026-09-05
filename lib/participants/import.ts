import { randomInt } from "node:crypto"

import { nisnSchema, nisSchema } from "@/lib/identifiers"
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
  nisn: number | null
  nis: string | null
  password: string | null
  groupNames: string[]
}

const usernamePattern = /^[a-zA-Z0-9_.]+$/

const PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
const PASSWORD_LOWER = "abcdefghijkmnopqrstuvwxyz"
const PASSWORD_DIGITS = "23456789"
const PASSWORD_SYMBOLS = "!@#$%^&*"

/**
 * Generate a cryptographically random 12-character password for rows that
 * did not provide one. Guarantees at least one uppercase letter, one
 * lowercase letter, one digit, and one symbol — the test asserts this
 * coverage, and the guarantee makes the passwords measurably stronger.
 * Shown once in the import result, never persisted.
 */
export function generatePassword(): string {
  const all =
    PASSWORD_UPPER + PASSWORD_LOWER + PASSWORD_DIGITS + PASSWORD_SYMBOLS
  const chars = [
    PASSWORD_UPPER[randomInt(PASSWORD_UPPER.length)],
    PASSWORD_LOWER[randomInt(PASSWORD_LOWER.length)],
    PASSWORD_DIGITS[randomInt(PASSWORD_DIGITS.length)],
    PASSWORD_SYMBOLS[randomInt(PASSWORD_SYMBOLS.length)],
  ]

  while (chars.length < 12) {
    chars.push(all[randomInt(all.length)])
  }

  // Shuffle so the guaranteed classes are not clumped at the start.
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)

    ;[chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]]
  }

  return chars.join("")
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

  const nisnRaw = parseCell(cells.NISN)
  const nisn = nisnRaw ? Number(nisnRaw) : null

  return {
    rowNumber,
    name,
    email,
    username: username || null,
    nisn: Number.isInteger(nisn) ? nisn : null,
    nis: parseCell(cells.NIS) || null,
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
  const push = (message: string) =>
    errors.push({ rowNumber: row.rowNumber, message })

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

  if (row.nisn === null) {
    push("NISN wajib diisi.")
  } else if (!nisnSchema.safeParse(row.nisn).success) {
    push("NISN harus 10 digit angka.")
  }

  if (row.nis !== null && !nisSchema.safeParse(row.nis).success) {
    push("NIS harus 3–20 karakter.")
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
  existingNisns: Set<number>,
  existingNis: Set<string>,
  knownGroups: Set<string>
): ImportPlan {
  const errors: RowError[] = []
  const seenEmails = new Set<string>()
  const seenNisns = new Set<number>()
  const seenNis = new Set<string>()

  for (const row of rows) {
    const rowErrors = validateImportRow(row, knownGroups)

    if (existingEmails.has(row.email)) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: "Email sudah terdaftar.",
      })
    }

    if (seenEmails.has(row.email)) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        message: "Email duplikat di dalam file.",
      })
    }

    if (row.nisn !== null) {
      if (existingNisns.has(row.nisn)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: "NISN sudah terdaftar.",
        })
      }

      if (seenNisns.has(row.nisn)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: "NISN duplikat di dalam file.",
        })
      }
    }

    if (row.nis !== null) {
      if (existingNis.has(row.nis)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: "NIS sudah terdaftar.",
        })
      }

      if (seenNis.has(row.nis)) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          message: "NIS duplikat di dalam file.",
        })
      }
    }

    seenEmails.add(row.email)
    if (row.nisn !== null) seenNisns.add(row.nisn)
    if (row.nis !== null) seenNis.add(row.nis)
    errors.push(...rowErrors)
  }

  return { rows, errors, valid: errors.length === 0 }
}
