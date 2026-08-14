import { randomUUID } from "node:crypto"

/**
 * Key scheme for media objects (Q1/Q6, ADR-0003).
 *
 * - `staging/<uuid>.<ext>` — the raw upload, before conversion.
 * - `media/<uuid>.webp` — the permanent WebP object the ledger owns.
 *
 * `media/*` is public-read (bucket policy) so question pages can display
 * images directly; `staging/*` is never public.
 */

export const UPLOADABLE_EXTS = ["png", "jpeg", "webp"] as const

export type UploadableExt = (typeof UPLOADABLE_EXTS)[number]

export function isUploadableExt(value: string): value is UploadableExt {
  return (UPLOADABLE_EXTS as readonly string[]).includes(value)
}

export function stagingKeyFor(ext: UploadableExt): string {
  return `staging/${randomUUID()}.${ext}`
}

export function permanentKeyFor(): string {
  return `media/${randomUUID()}.webp`
}

/**
 * The 5 MB upload limit (Q6). Applies to the original upload; the stored
 * WebP is generally smaller.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/**
 * The server-side enforcement: an object larger than the limit is rejected.
 * Must match the shape the content policy accepts for `image.src`.
 */
export function isPermanentMediaKey(key: string): boolean {
  return /^media\/[0-9a-f-]{36}\.webp$/.test(key)
}

export function isStagingKey(key: string): boolean {
  return /^staging\/[0-9a-f-]{36}\.(png|jpeg|webp)$/.test(key)
}
