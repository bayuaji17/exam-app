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
import { listResultsHubs } from "@/lib/grading/queries"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const BASE_PATH = "/dashboard/exam-results"

function formatNumber(value: number | null): string {
  return value !== null ? value.toLocaleString("id-ID") : "—"
}

export default async function ExamResultsPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const hubs = await listResultsHubs()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Hasil Ujian</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan hasil per jadwal ujian yang memiliki pengerjaan selesai.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jadwal</TableHead>
              <TableHead>Terkumpul</TableHead>
              <TableHead>Menunggu Penilaian</TableHead>
              <TableHead>Rata-rata Nilai</TableHead>
              <TableHead>Tingkat Kelulusan</TableHead>
              <TableHead className="w-[80px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hubs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Belum ada ujian dengan pengerjaan yang dikumpulkan.
                </TableCell>
              </TableRow>
            ) : (
              hubs.map((hub) => {
                const slug = hub.slug
                return (
                  <TableRow key={hub.scheduleId}>
                    <TableCell className="font-medium">{hub.scheduleName}</TableCell>
                    <TableCell>{hub.submittedCount}</TableCell>
                    <TableCell>{hub.pendingCount}</TableCell>
                    <TableCell>{formatNumber(hub.averageScore)}</TableCell>
                    <TableCell>
                      {hub.passRate !== null
                        ? `${hub.passRate.toLocaleString("id-ID")}%`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        className="underline underline-offset-4 hover:no-underline"
                        href={`${BASE_PATH}/${slug}`}
                      >
                        Lihat
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
