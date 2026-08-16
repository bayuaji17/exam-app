import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ParticipantGroupForm } from "@/components/participant-group-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tambah Grup Peserta</h1>
        <p className="text-sm text-muted-foreground">
          Kelompokkan peserta agar mudah diberi akses ke ujian sekaligus.
        </p>
      </div>

      <ParticipantGroupForm />
    </div>
  )
}
