const MAX_SLUG_LENGTH = 80
const FALLBACK_SLUG = "item"

/**
 * Turn a human-readable name into a URL-safe slug.
 *
 * - lowercase, trimmed; runs of non-alphanumeric characters collapse to a single hyphen
 * - accented characters are decomposed to their base letters (NFKD + strip combining marks)
 * - other scripts are dropped
 * - truncated to a safe length on a hyphen boundary
 * - an empty result falls back to a neutral slug
 */
export function slugify(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (!normalized) {
    return FALLBACK_SLUG
  }

  if (normalized.length <= MAX_SLUG_LENGTH) {
    return normalized
  }

  return normalized.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "") || FALLBACK_SLUG
}

/**
 * Derive a unique slug from a name, appending `-2`, `-3`, … until `isTaken` reports it free.
 *
 * `isTaken` is an async predicate so it can back onto a database lookup without this module
 * knowing anything about the schema.
 */
export async function ensureUniqueSlug(
  name: string,
  isTaken: (slug: string) => Promise<boolean>
): Promise<string> {
  const candidate = slugify(name)

  if (!(await isTaken(candidate))) {
    return candidate
  }

  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`
    const next = `${candidate.slice(0, MAX_SLUG_LENGTH - suffix.length)}${suffix}`

    if (!(await isTaken(next))) {
      return next
    }
  }
}
