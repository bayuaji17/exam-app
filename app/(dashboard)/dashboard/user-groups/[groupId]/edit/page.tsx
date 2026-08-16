import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ParticipantGroupForm } from "@/components/participant-group-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getParticipantGroupById } from "@/lib/participants/queries"

const BASE_PATH = "/dashboard/user-groups"

export default async function EditParticipantGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const group = await getParticipantGroupById(groupId)

  if (!group) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          href={BASE_PATH}
        >
          ← Kembali ke Grup Peserta
        </Link>
        <h1 className="text-2xl font-semibold">Edit Grup Peserta</h1>
      </div>

      <ParticipantGroupForm
        group={{
          id: group.id,
          name: group.name,
          description: group.description,
        }}
      />
    </div>
  )
}
