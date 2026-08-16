import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"

import { CreateUserForm } from "@/components/create-user-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { getAssignableRoles } from "@/lib/users/create"

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tambah Pengguna</h1>
        <p className="text-sm text-muted-foreground">
          Buat akun baru. Pengguna masuk menggunakan alamat email dan kata sandi
          ini. Ingin membuat banyak peserta sekaligus?{" "}
          <Link
            className="underline underline-offset-4 hover:no-underline"
            href="/dashboard/users/import"
          >
            Gunakan import Excel
          </Link>
          .
        </p>
      </div>

      <CreateUserForm assignableRoles={assignableRoles} />

      <Link
        className="self-start text-sm underline underline-offset-4 hover:no-underline"
        href="/dashboard/users"
      >
        Kembali ke daftar pengguna
      </Link>
    </div>
  )
}
