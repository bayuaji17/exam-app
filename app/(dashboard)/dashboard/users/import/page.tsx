import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ParticipantImportForm } from "@/components/participant-import-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"

const USERS_PATH = "/dashboard/users"

export default async function ParticipantImportPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, USERS_PATH)) {
    redirect("/dashboard/forbidden")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Import Peserta</h1>
        <p className="text-sm text-muted-foreground">
          Buat banyak akun peserta sekaligus dari file Excel.
        </p>
      </div>

      <ParticipantImportForm />
    </div>
  )
}
