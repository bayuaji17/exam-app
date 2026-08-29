import { randomBytes } from "crypto"

const TOKEN_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Excluded I, O, 0, 1 for clarity

/**
 * Generates a 6-character uppercase alphanumeric exam session token.
 */
export function generateExamToken(length = 6): string {
  const bytes = randomBytes(length)
  let result = ""
  for (let i = 0; i < length; i++) {
    result += TOKEN_CHARSET[bytes[i] % TOKEN_CHARSET.length]
  }
  return result
}

/**
 * Normalizes user token input by trimming whitespace and converting to uppercase.
 */
export function normalizeExamToken(input: string): string {
  return input.trim().toUpperCase()
}

/**
 * Validates whether the given string is in a valid token format.
 */
export function isValidTokenFormat(input: string): boolean {
  const normalized = normalizeExamToken(input)
  return /^[A-Z0-9]{4,12}$/.test(normalized)
}
