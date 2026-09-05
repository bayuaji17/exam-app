import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { UserPlusIcon } from "lucide-react"

import { CreateUserForm } from "@/components/create-user-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { getAssignableRoles } from "@/lib/users/create"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default async function CreateUserPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  // Which roles are offered is decided here rather than in the browser, so a
  // tampered client cannot widen its own options. The server hook in
  // `lib/auth.ts` rejects anything it should not accept regardless.
  const assignableRoles = getAssignableRoles(getAppRoles(session.user.role))

  if (assignableRoles.length === 0) {
    redirect("/dashboard/forbidden")
  }

  return (
    <div className="mx-auto w-full py-2">
      <div className="rounded-2xl border bg-card p-6 shadow-xs md:p-8">
        {/* Card Header */}
        <div className="flex items-start gap-4 border-b pb-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
            <UserPlusIcon className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Tambah Pengguna
            </h1>
            <p className="text-sm text-muted-foreground">
              Buat akun baru. Pengguna masuk menggunakan alamat email dan kata
              sandi ini.
            </p>
            <p className="text-sm text-muted-foreground">
              Ingin membuat banyak peserta sekaligus?{" "}
              <Link
                className="font-medium text-primary underline-offset-4 hover:underline"
                href="/dashboard/users/import"
              >
                Gunakan import Excel.
              </Link>
            </p>
          </div>
        </div>

        {/* Card Body with Form & Info Grid */}
        <div className="pt-6">
          <CreateUserForm assignableRoles={assignableRoles} />
        </div>
      </div>
    </div>
  )
}
