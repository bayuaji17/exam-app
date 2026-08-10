import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { SessionList } from "@/components/session-list"
import { auth } from "@/lib/auth"
import { getEmailsByIds, listActiveSessionsForUser } from "@/lib/users/queries"

/**
 * The cookie Better Auth reads the session token from.
 * Prefix and name are the library defaults; the project does not override
 * `advanced.cookies` in `lib/auth.ts`.
 */
const SESSION_COOKIE = "better-auth.session_token"

export default async function SessionsPage() {
  const requestHeaders = await headers()
  const session = await auth.api.getSession({ headers: requestHeaders })

  if (!session) {
    redirect("/login")
  }

  const activeSessions = await listActiveSessionsForUser(session.user.id)

  // Better Auth signs the session cookie as "<token>.<signature>"; the
  // database stores just the token, so take everything before the first dot.
  const cookieValue = (await cookies()).get(SESSION_COOKIE)?.value ?? null
  const currentToken = cookieValue?.split(".")[0] ?? null

  const impersonatorIds = [
    ...new Set(
      activeSessions
        .map((active) => active.impersonatedBy)
        .filter((id): id is string => id !== null)
    ),
  ]
  const impersonatorEmails = await getEmailsByIds(impersonatorIds)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Sesi Aktif</h1>
        <p className="text-sm text-muted-foreground">
          Perangkat yang masuk ke akun Anda.
        </p>
      </div>

      <SessionList
        currentToken={currentToken}
        impersonatorEmails={impersonatorEmails}
        sessions={activeSessions}
      />
    </div>
  )
}
