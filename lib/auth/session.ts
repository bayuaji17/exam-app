import { cache } from "react"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

/**
 * Cached per-request session helper for Server Components.
 * React cache deduplicates calls to `auth.api.getSession` within the same render pass.
 */
export const getDashboardSession = cache(async () => {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })
  const pathname = requestHeaders.get("x-pathname") ?? "/dashboard"

  return { session, pathname }
})
