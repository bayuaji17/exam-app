import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ProfileForm } from "@/components/profile-form"
import { auth } from "@/lib/auth"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default async function SettingsProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Profil</h1>
        <p className="text-sm text-muted-foreground">
          Nama dan username yang ditampilkan untuk akun Anda.
        </p>
      </div>

      <ProfileForm
        name={session.user.name}
        username={session.user.username ?? null}
      />
    </div>
  )
}
