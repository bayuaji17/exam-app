"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Clock,
  GraduationCap,
  KeyRound,
  Play,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { attemptsRemaining } from "@/lib/attempts/limits"
import { ExamTokenDialog } from "./exam-token-dialog"

export interface ParticipantScheduleItem {
  scheduleId: string
  scheduleName: string
  slug: string
  packageId: string
  packageName: string
  token: string | null
  startsAt: string
  endsAt: string
  durationMinutes: number | null
  questionCount: number
  passScore: string | null
  attemptLimit: number | null
  status: "upcoming" | "ongoing" | "ended"
  openAttemptId: string | null
  openDeadlineAt: string | null
  submittedCount: number
  lastScore: string | null
}

const STATUS_CONFIG = {
  upcoming: {
    label: "Akan Datang",
    variant: "outline" as const,
    className: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  ongoing: {
    label: "Berlangsung",
    variant: "default" as const,
    className: "bg-emerald-600 hover:bg-emerald-600 text-white font-semibold",
  },
  ended: {
    label: "Selesai",
    variant: "secondary" as const,
    className: "text-muted-foreground",
  },
}

function formatScheduleTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ParticipantExamList({
  schedules,
}: {
  schedules: ParticipantScheduleItem[]
}) {
  const router = useRouter()
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] =
    useState<ParticipantScheduleItem | null>(null)

  function handleEnterSession(schedule: ParticipantScheduleItem) {
    const hasToken = Boolean(schedule.token && schedule.token.trim().length > 0)

    if (hasToken) {
      setSelectedSchedule(schedule)
      setTokenDialogOpen(true)
    } else {
      if (schedule.status === "upcoming") {
        router.push(`/exam/${schedule.slug}/waiting-room`)
      } else {
        router.push(`/exam/${schedule.slug}/intro`)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Active Exam Alert if user currently has an open attempt */}
      {schedules.some((s) => s.openAttemptId) && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/10 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              <Play className="size-5 fill-current" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Ujian Sedang Berlangsung
              </h3>
              <p className="text-xs text-muted-foreground">
                Anda memiliki sesi ujian yang sedang berjalan. Lanjutkan untuk menyelesaikan pengerjaan.
              </p>
            </div>
          </div>
          {(() => {
            const active = schedules.find((s) => s.openAttemptId)
            if (!active) return null
            return (
              <Button asChild className="gap-2">
                <Link href={`/exam/${active.slug}/attempt/${active.openAttemptId}`}>
                  <span>Lanjutkan Ujian</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )
          })()}
        </div>
      )}

      {/* Main Table for Desktop and Cards for Mobile */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Ujian & Paket</TableHead>
              <TableHead>Jadwal Pelaksanaan</TableHead>
              <TableHead>Durasi & Soal</TableHead>
              <TableHead>Percobaan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <GraduationCap className="size-8 opacity-40" />
                    <span>Belum ada ujian yang ditugaskan kepada Anda.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((schedule) => {
                const remaining = attemptsRemaining(
                  schedule.attemptLimit,
                  schedule.submittedCount
                )
                const isOngoing = schedule.status === "ongoing"
                const isUpcoming = schedule.status === "upcoming"
                const isEnded = schedule.status === "ended"
                const hasOpenAttempt = Boolean(schedule.openAttemptId)
                const canTake = isOngoing && remaining > 0
                const requiresToken = Boolean(
                  schedule.token && schedule.token.trim().length > 0
                )
                const statusBadge = STATUS_CONFIG[schedule.status]

                return (
                  <TableRow key={schedule.scheduleId} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {schedule.scheduleName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {schedule.packageName}
                        </span>
                        {requiresToken && (
                          <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <KeyRound className="size-3" />
                            Memerlukan Token
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {formatScheduleTime(schedule.startsAt)}
                        </span>
                        <span>s.d. {formatScheduleTime(schedule.endsAt)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {schedule.durationMinutes !== null
                            ? `${schedule.durationMinutes} menit`
                            : "Tanpa batas"}
                        </span>
                        <span className="text-muted-foreground">
                          {schedule.questionCount} butir soal
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      {schedule.attemptLimit === null ||
                      schedule.attemptLimit === 0 ? (
                        <span>{schedule.submittedCount}x (tak terbatas)</span>
                      ) : (
                        <span>
                          {schedule.submittedCount} / {schedule.attemptLimit}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={statusBadge.variant}
                        className={statusBadge.className}
                      >
                        {statusBadge.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap">
                      {hasOpenAttempt ? (
                        <Button asChild size="sm">
                          <Link
                            href={`/exam/${schedule.slug}/attempt/${schedule.openAttemptId}`}
                          >
                            Lanjutkan
                          </Link>
                        </Button>
                      ) : canTake ? (
                        <Button
                          size="sm"
                          onClick={() => handleEnterSession(schedule)}
                          className="gap-1.5"
                        >
                          <Play className="size-3.5 fill-current" />
                          <span>Masuk Sesi Ujian</span>
                        </Button>
                      ) : isUpcoming ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEnterSession(schedule)}
                          className="gap-1.5"
                        >
                          <Clock className="size-3.5 text-blue-500" />
                          <span>Masuk Ruang Tunggu</span>
                        </Button>
                      ) : schedule.submittedCount > 0 ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/exam/${schedule.slug}/intro`}>
                            Lihat Hasil
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {isEnded ? "Waktu Berakhir" : "Batas Habis"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Token Modal Dialog */}
      {selectedSchedule && (
        <ExamTokenDialog
          isOpen={tokenDialogOpen}
          onClose={() => {
            setTokenDialogOpen(false)
            setSelectedSchedule(null)
          }}
          scheduleId={selectedSchedule.scheduleId}
          scheduleName={selectedSchedule.scheduleName}
          packageName={selectedSchedule.packageName}
          slug={selectedSchedule.slug}
          status={selectedSchedule.status as "upcoming" | "ongoing"}
        />
      )}
    </div>
  )
}
