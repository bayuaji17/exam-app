import { Suspense } from "react"
import { redirect } from "next/navigation"
import { ShieldCheckIcon } from "lucide-react"

import { TableSkeleton } from "@/components/dashboard-components/skeletons"
import { RolesTable } from "@/components/roles/roles-table"
import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { hasPermission } from "@/lib/auth/rbac-guards"
import { getAllRoles, getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import { getDashboardSession } from "@/lib/auth/session"

async function RolesContent() {
  const { session } = await getDashboardSession()

  if (!session) {
    redirect("/login")
  }

  const permissions = await getUserEffectivePermissions(session.user.id)
  const authorized = hasPermission(permissions, PERMISSIONS.ROLES_READ)
  if (!authorized) {
    redirect("/dashboard/forbidden")
  }

  const roles = await getAllRoles()

  return <RolesTable roles={roles} />
}

export default function RolesPage() {
  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
          <ShieldCheckIcon className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            Peran & Hak Akses (RBAC)
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola peran pengguna, perizinan granular, dan matriks hak akses aplikasi.
          </p>
        </div>
      </div>

      <Suspense fallback={<TableSkeleton columns={5} rows={5} />}>
        <RolesContent />
      </Suspense>
    </div>
  )
}
