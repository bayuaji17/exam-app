import { randomInt } from "node:crypto"
import { z } from "zod"

/**
 * The shared contract for the identifier feature (ticket 01).
 *
 * Both sides code against this module: the backend implements the checks and
 * the nomor peserta generation; the frontend validates forms with the same
 * schemas. The schema edits themselves are hand-applied (never
 * `auth:generate`, which rewrites the schema file destructively).
 */

export const IDENTIFIER_FIELDS = ["nisn", "nis", "nip", "kodePaket"] as const

export type IdentifierField = (typeof IDENTIFIER_FIELDS)[number]

/** NISN — national student number: exactly 10 digits. */
export const nisnSchema = z
  .number({ error: "NISN harus berupa angka." })
  .int("NISN harus bilangan bulat.")
  .positive("NISN harus lebih dari 0.")
  .min(1_000_000_000, "NISN harus 10 digit.")
  .max(9_999_999_999, "NISN harus 10 digit.")

/** NIS — school number: optional, 3–20 characters. */
export const nisSchema = z
  .string()
  .trim()
  .min(3, "NIS minimal 3 karakter.")
  .max(20, "NIS maksimal 20 karakter.")
  .optional()

/** NIP — staff number: required where it applies (admin roles), 3–20 characters. */
export const nipSchema = z
  .string()
  .trim()
  .min(3, "NIP minimal 3 karakter.")
  .max(20, "NIP maksimal 20 karakter.")

/** Kode paket ujian: required, 3–20 characters. */
export const kodePaketSchema = z
  .string()
  .trim()
  .min(3, "Kode paket ujian minimal 3 karakter.")
  .max(20, "Kode paket ujian maksimal 20 karakter.")

/**
 * The unique-check contract. Implemented server-side per field; `excludeId`
 * skips the row being edited so keeping one's own value is never reported
 * as taken.
 */
export type IdentifierTaken = (
  field: IdentifierField,
  value: string | number,
  excludeId?: string
) => Promise<boolean>

/**
 * Uppercase alphanumeric without ambiguous characters (0/O/1/I), so the
 * nomor peserta can be read back off a handwritten answer sheet.
 */
const NOMOR_PESERTA_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

const NOMOR_PESERTA_MIN = 4
const NOMOR_PESERTA_MAX = 8

/**
 * `{kodePaket}-{random}` with a 4–8 character random suffix. Collisions are
 * guarded by a `UNIQUE(scheduleId, nomorPeserta)` index plus a retry in the
 * caller.
 */
export function generateNomorPeserta(kodePaket: string): string {
  const length = randomInt(NOMOR_PESERTA_MIN, NOMOR_PESERTA_MAX + 1)
  let random = ""

  for (let i = 0; i < length; i += 1) {
    random += NOMOR_PESERTA_ALPHABET[randomInt(NOMOR_PESERTA_ALPHABET.length)]
  }

  return `${kodePaket}-${random}`
}
