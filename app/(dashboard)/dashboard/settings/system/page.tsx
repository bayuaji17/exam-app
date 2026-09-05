// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

export default function SettingsSystemPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Konfigurasi Global</h1>
      <p className="text-sm text-muted-foreground">
        Pengaturan platform secara menyeluruh (misalnya aturan penilaian default
        dan kebijakan ujian) akan tersedia di sini. Segera hadir.
      </p>
    </div>
  )
}
