"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Hourglass,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface WaitingRoomCardProps {
  scheduleId: string
  scheduleSlug: string
  scheduleName: string
  packageName: string
  startsAt: string
  endsAt: string
  durationMinutes: number | null
  questionCount: number
}

function formatIndonesianDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatIndonesianTime(isoString: string): string {
  const date = new Date(isoString)
  return (
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB"
  )
}

export function WaitingRoomCard({
  scheduleSlug,
  scheduleName,
  packageName,
  startsAt,
  endsAt,
  durationMinutes,
  questionCount,
}: WaitingRoomCardProps) {
  const router = useRouter()
  const [now, setNow] = useState<number>(() => Date.now())

  const startTime = new Date(startsAt).getTime()
  const endTime = new Date(endsAt).getTime()

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const diffToStart = Math.max(0, Math.floor((startTime - now) / 1000))
  const isStarted = diffToStart <= 0
  const isEnded = now >= endTime

  const days = Math.floor(diffToStart / 86400)
  const hours = Math.floor((diffToStart % 86400) / 3600)
  const minutes = Math.floor((diffToStart % 3600) / 60)
  const seconds = diffToStart % 60

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href="/exam"
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit transition-colors"
      >
        ← Kembali ke Daftar Ujian
      </Link>

      <Card className="border-2 shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 flex items-center justify-center">
            {isStarted ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1.5 px-3 py-1 text-xs">
                <CheckCircle2 className="size-3.5" />
                Waktu Ujian Telah Tiba
              </Badge>
            ) : (
              <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 gap-1.5 px-3 py-1 text-xs">
                <Hourglass className="size-3.5 animate-pulse" />
                Ruang Tunggu Ujian
              </Badge>
            )}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {scheduleName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{packageName}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tanggal & Jam Mulai Ujian */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">
                    Tanggal Ujian Dimulai
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {formatIndonesianDate(startsAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Clock className="size-5" />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-semibold">
                    Jam Mulai & Selesai
                  </span>
                  <p className="font-semibold text-foreground text-sm">
                    {formatIndonesianTime(startsAt)} – {formatIndonesianTime(endsAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Countdown Timer */}
          {!isStarted && !isEnded && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 py-6 px-4 text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Ujian Akan Dimulai Dalam
              </span>

              <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-sm w-full">
                {days > 0 && (
                  <div className="flex flex-col items-center justify-center rounded-xl border bg-background p-2 sm:p-3 shadow-xs">
                    <span className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
                      {String(days).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      Hari
                    </span>
                  </div>
                )}
                <div className="flex flex-col items-center justify-center rounded-xl border bg-background p-2 sm:p-3 shadow-xs">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
                    {String(hours).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    Jam
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border bg-background p-2 sm:p-3 shadow-xs">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
                    {String(minutes).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    Menit
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border bg-background p-2 sm:p-3 shadow-xs">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-primary">
                    {String(seconds).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    Detik
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Halaman ini akan otomatis mengaktifkan tombol masuk ketika waktu ujian tiba.
              </p>
            </div>
          )}

          {isStarted && !isEnded && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <div className="rounded-full bg-emerald-500/20 p-3 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                Waktu Ujian Telah Tiba!
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 max-w-md">
                Sesi pengerjaan ujian telah dibuka. Silakan lanjutkan ke onboarding aturan ujian dan mulai pengerjaan.
              </p>
            </div>
          )}

          {isEnded && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
              <AlertCircle className="size-6 text-destructive" />
              <h3 className="text-base font-bold text-destructive">
                Sesi Ujian Telah Berakhir
              </h3>
              <p className="text-xs text-destructive max-w-md">
                Waktu pelaksanaan ujian ini telah berakhir pada {formatIndonesianDate(endsAt)} pukul {formatIndonesianTime(endsAt)}.
              </p>
            </div>
          )}

          {/* Petunjuk Peserta */}
          <div className="space-y-2 rounded-xl border p-4 text-xs text-muted-foreground bg-card">
            <h4 className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
              <ShieldCheck className="size-4 text-primary" />
              Petunjuk & Persiapan Peserta
            </h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Pastikan perangkat Anda memiliki daya baterai yang cukup dan terhubung ke internet.</li>
              <li>Durasi pengerjaan: {durationMinutes ? `${durationMinutes} menit` : "Tanpa batas waktu"}, dengan total {questionCount} butir soal.</li>
              <li>Jangan me-refresh atau menutup tab secara paksa saat pengerjaan berlangsung.</li>
              <li>Dilarang membuka tab lain atau melakukan kecurangan selama ujian berlangsung.</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          {isStarted && !isEnded ? (
            <Button
              className="w-full gap-2 h-11 text-base font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => router.push(`/exam/${scheduleSlug}/intro`)}
            >
              <span>Lanjut ke Aturan Ujian & Mulai</span>
              <ArrowRight className="size-5" />
            </Button>
          ) : isEnded ? (
            <Button asChild variant="outline" className="w-full">
              <Link href="/exam">Kembali ke Daftar Ujian</Link>
            </Button>
          ) : (
            <Button
              disabled
              variant="secondary"
              className="w-full h-11 font-medium gap-2 opacity-80"
            >
              <Clock className="size-4 animate-spin" />
              <span>Menunggu Waktu Ujian Dimulai…</span>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
