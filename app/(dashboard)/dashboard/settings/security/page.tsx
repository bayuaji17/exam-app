import Link from "next/link"

import { PasswordForm } from "@/components/password-form"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default function SettingsSecurityPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Keamanan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola kata sandi dan sesi aktif akun Anda.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Ubah Kata Sandi</h2>
        <PasswordForm />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Sesi</h2>
        <Link
          className="self-start text-sm underline underline-offset-4 hover:no-underline"
          href="/dashboard/settings/security/sessions"
        >
          Kelola sesi aktif
        </Link>
      </section>
    </div>
  )
}
