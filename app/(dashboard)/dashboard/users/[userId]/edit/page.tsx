import { headers } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { EditUserBanForm } from "@/components/edit-user-ban-form"
import { EditUserRoleForm } from "@/components/edit-user-role-form"
import { Separator } from "@/components/ui/separator"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { canBanUser, canChangeRole } from "@/lib/users/edit"
import { formatBanExpiryDate, formatRoleLabel } from "@/lib/users/format"
import { getUserById } from "@/lib/users/queries"

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [actorRole] = getAppRoles(session.user.role)

  if (!actorRole) {
    redirect("/login")
  }

  const target = await getUserById(userId)

  if (!target) {
    notFound()
  }

  const actor = { id: session.user.id, role: actorRole }
  const editTarget = { id: target.id, role: target.role }

  const mayChangeRole = canChangeRole(actor, editTarget)
  const mayBan = canBanUser(actor, editTarget)

  // Each action is authorised separately, so an admin who may ban but not
  // change roles still gets a useful page.
  const hasAnyAction = mayChangeRole || mayBan

  const banExpiry = target.banExpires
    ? formatBanExpiryDate(target.banExpires)
    : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Ubah Pengguna</h1>
        <p className="text-sm text-muted-foreground">
          {target.name} · {target.email} · {formatRoleLabel(target.role)}
        </p>
      </div>

      {!hasAnyAction ? (
        <p className="text-sm text-muted-foreground">
          {actor.id === target.id
            ? "Anda tidak dapat mengubah akun Anda sendiri."
            : "Akun super admin tidak dapat diubah dari aplikasi."}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {mayChangeRole && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-medium">Ubah Role</h2>
              <EditUserRoleForm
                currentRole={target.role}
                userId={target.id}
              />
            </section>
          )}

          {mayChangeRole && mayBan && <Separator />}

          {mayBan && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-medium">Status Blokir</h2>
              <EditUserBanForm
                currentBanExpiry={banExpiry}
                currentBanReason={target.banReason}
                isBanned={target.banned}
                userId={target.id}
              />
            </section>
          )}
        </div>
      )}

      <Link
        className="self-start text-sm underline underline-offset-4 hover:no-underline"
        href="/dashboard/users"
      >
        Kembali ke daftar pengguna
      </Link>
    </div>
  )
}
