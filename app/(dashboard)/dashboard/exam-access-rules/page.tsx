import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { listSchedulesWithEligibilitySummary } from "@/lib/eligibility/queries"

const BASE_PATH = "/dashboard/exam-access-rules"

function formatDateTime(date: Date): string {
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function ExamAccessRulesPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const schedules = await listSchedulesWithEligibilitySummary()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Aturan Akses</h1>
        <p className="text-sm text-muted-foreground">
          Kelola peserta dan grup yang berhak mengikuti setiap jadwal ujian.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jadwal</TableHead>
              <TableHead>Mulai</TableHead>
              <TableHead>Selesai</TableHead>
              <TableHead>Akses Peserta</TableHead>
              <TableHead>Akses Grup</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Belum ada jadwal ujian.
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((schedule) => {
                const slug = schedule.slug
                return (
                  <TableRow key={schedule.scheduleId}>
                    <TableCell className="font-medium">
                      {schedule.scheduleName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(schedule.startsAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(schedule.endsAt)}
                    </TableCell>
                    <TableCell>{schedule.userGrants}</TableCell>
                    <TableCell>{schedule.groupGrants}</TableCell>
                    <TableCell>
                      <Link
                        className="underline underline-offset-4 hover:no-underline"
                        href={`/dashboard/exam-schedules/${slug}/eligibility`}
                      >
                        Kelola
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
