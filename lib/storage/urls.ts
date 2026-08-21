/**
 * Client-safe variant for the editor and components: reads only the
 * NEXT_PUBLIC variable, never the server-only S3 credentials.
 */
export function resolveMediaKeyForClient(key: string): string {
  const base = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ?? ""

  return `${base.replace(/\/$/, "")}/${key}`
}

/**
 * Resolve a media key to its public URL. Content stores keys (portable
 * across environments); rendering resolves them (ADR-0002).
 *
 * Safe to call on both client and server: on the client (or when rendering
 * live preview in the editor), it uses NEXT_PUBLIC_S3_PUBLIC_BASE_URL without
 * touching server-only S3 credentials.
 */
export function resolveMediaKey(key: string): string {
  const base =
    process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ||
    process.env.S3_PUBLIC_BASE_URL ||
    ""

  return `${base.replace(/\/$/, "")}/${key}`
}
