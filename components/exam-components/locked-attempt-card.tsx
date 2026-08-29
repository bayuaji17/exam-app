"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, RefreshCw, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { recoverAttemptSessionAction } from "@/lib/attempts/actions"

export function LockedAttemptCard({
  attemptId,
  scheduleId,
  scheduleSlug,
  scheduleName,
}: {
  attemptId: string
  scheduleId: string
  scheduleSlug: string
  scheduleName: string
}) {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRecover(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return

    setError(null)
    startTransition(async () => {
      const result = await recoverAttemptSessionAction({
        attemptId,
        scheduleId,
        token: token.trim().toUpperCase(),
      })

      if (!result.ok) {
        setError(result.message)
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="rounded-full bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-bold text-foreground">
            Akses Ujian Terkunci
          </h2>
          <p className="text-sm font-medium text-muted-foreground">
            {scheduleName}
          </p>
        </div>

        <p className="text-sm text-muted-foreground text-balance">
          Pengerjaan ujian ini sedang aktif pada sesi perangkat lain. Untuk
          mencegah kecurangan, satu pengerjaan hanya dapat dibuka pada satu
          perangkat. Jika perangkat Anda sebelumnya mengalami kendala, masukkan{" "}
          <strong className="text-foreground">Token Ujian</strong> untuk
          memulihkan sesi ke perangkat ini.
        </p>

        <form onSubmit={handleRecover} className="w-full mt-2 flex flex-col gap-3">
          <Input
            className="uppercase tracking-widest font-mono text-center font-bold text-lg h-11"
            maxLength={6}
            placeholder="TOKEN UJIAN"
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            disabled={isPending}
            required
          />

          {error && (
            <p className="text-xs text-destructive font-medium flex items-center justify-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full font-semibold"
            disabled={isPending || token.length < 6}
          >
            {isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Memulihkan Sesi…
              </>
            ) : (
              "Pulihkan Sesi ke Perangkat Ini"
            )}
          </Button>

          <Button asChild variant="ghost" size="sm" className="mt-1">
            <Link href={`/exam/${scheduleSlug}/intro`}>
              Kembali ke Ruang Tunggu
            </Link>
          </Button>
        </form>
      </div>
    </div>
  )
}
