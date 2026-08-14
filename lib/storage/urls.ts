import { storageConfig } from "./client"

/**
 * Resolve a media key to its public URL. Content stores keys (portable
 * across environments); rendering resolves them (ADR-0002). Server-side.
 */
export function resolveMediaKey(key: string): string {
  return `${storageConfig().publicBaseUrl.replace(/\/$/, "")}/${key}`
}

/**
 * Client-safe variant for the editor: reads only the NEXT_PUBLIC variable,
 * never the server-only S3 credentials.
 */
export function resolveMediaKeyForClient(key: string): string {
  const base = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ?? ""

  return `${base.replace(/\/$/, "")}/${key}`
}
