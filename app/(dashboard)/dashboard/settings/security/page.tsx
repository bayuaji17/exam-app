import Link from "next/link"

export default function SettingsSecurityPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Keamanan</h1>
      <Link
        className="self-start text-sm underline underline-offset-4 hover:no-underline"
        href="/dashboard/settings/security/sessions"
      >
        Sesi aktif
      </Link>
    </div>
  )
}
