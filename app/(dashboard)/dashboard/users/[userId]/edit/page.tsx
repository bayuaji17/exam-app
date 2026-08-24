import { headers } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeftIcon, InfoIcon, UserCogIcon, UserIcon } from "lucide-react"

import { EditUserBanForm } from "@/components/edit-user-ban-form"
import { EditUserIdentifiersForm } from "@/components/edit-user-identifiers-form"
import { EditUserRoleForm } from "@/components/edit-user-role-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { canBanUser, canChangeRole, canEditUser } from "@/lib/users/edit"
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
  const hasAnyAction = canEditUser(actor, editTarget)

  const banExpiry = target.banExpires
    ? formatBanExpiryDate(target.banExpires)
    : null

  return (
    <div className="mx-auto flex w-full flex-col gap-6 py-2">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
          <UserCogIcon className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            Ubah Pengguna
          </h1>
          <p className="text-sm text-muted-foreground">
            Perbarui informasi pengguna dan atur aksesnya.
          </p>
        </div>
      </div>

      {/* Top User Info Summary Card */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:grid-cols-3 sm:items-center sm:gap-6 md:p-6">
        {/* Nama Pengguna */}
        <div className="flex items-center gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
            <UserIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-muted-foreground">
              Nama Pengguna
            </span>
            <span className="block truncate text-sm font-semibold text-foreground md:text-base">
              {target.name}
            </span>
          </div>
        </div>

        {/* Email */}
        <div className="min-w-0">
          <span className="block text-xs font-medium text-muted-foreground">
            Email
          </span>
          <span className="block truncate text-sm font-semibold text-foreground md:text-base">
            {target.email}
          </span>
        </div>

        {/* Role Saat Ini */}
        <div>
          <span className="block text-xs font-medium text-muted-foreground">
            Role Saat Ini
          </span>
          <div className="mt-1">
            <Badge className="bg-primary text-primary-foreground">
              {formatRoleLabel(target.role)}
            </Badge>
          </div>
        </div>
      </div>

      {!hasAnyAction ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          {actor.id === target.id
            ? "Anda tidak dapat mengubah akun Anda sendiri."
            : "Akun super admin tidak dapat diubah dari aplikasi."}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
          <EditUserIdentifiersForm
            initialNip={target.nip}
            initialNis={target.nis}
            initialNisn={target.nisn}
            role={target.role}
            userId={target.id}
          />

          {mayChangeRole && (
            <EditUserRoleForm currentRole={target.role} userId={target.id} />
          )}

          {mayBan && (
            <EditUserBanForm
              currentBanExpiry={banExpiry}
              currentBanReason={target.banReason}
              isBanned={target.banned}
              userId={target.id}
            />
          )}
        </div>
      )}

      {/* Bottom Information Callout */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 dark:border-primary/20 dark:bg-primary/10">
        <div className="flex items-start gap-3">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">Informasi</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Perubahan yang Anda lakukan akan langsung berlaku.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center pt-2">
        <Button asChild type="button" variant="outline">
          <Link className="gap-2" href="/dashboard/users">
            <ArrowLeftIcon className="size-4" />
            <span>Kembali ke Daftar Pengguna</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
