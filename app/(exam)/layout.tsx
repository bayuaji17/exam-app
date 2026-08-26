import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { HydrationMarker } from "@/components/hydration-marker"
import { ExamSignOutButton } from "@/components/exam-components/exam-sign-out-button"
import { auth } from "@/lib/auth"
import { APP_ROLES, getAppRoles } from "@/lib/auth-roles"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

/**
 * The participant shell: no sidebar, minimal header. Only `user`-role
 * accounts reach the exam flow — admins manage, participants take.
 */
export default async function ExamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || role !== APP_ROLES.USER) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link className="text-lg font-semibold" href="/exam">
            Ujian Online
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {session.user.name}
            </span>
            <ExamSignOutButton />
          </div>
        </div>
      </header>

      <HydrationMarker />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  )
}
