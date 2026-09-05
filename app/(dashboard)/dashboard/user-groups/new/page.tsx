import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { UsersIcon } from "lucide-react"

import { ParticipantGroupForm } from "@/components/participant-group-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/user-groups"

export default async function NewParticipantGroupPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  return (
    <div className="mx-auto w-full py-2">
      <div className="rounded-2xl border bg-card p-6 shadow-xs md:p-8">
        {/* Card Header */}
        <div className="flex items-start gap-4 border-b pb-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
            <UsersIcon className="size-6" />
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Tambah Grup Peserta
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelompokkan peserta agar mudah diberi akses ke jadwal ujian
              sekaligus.
            </p>
          </div>
        </div>

        {/* Card Body & Form */}
        <div className="pt-6">
          <ParticipantGroupForm />
        </div>
      </div>
    </div>
  )
}
