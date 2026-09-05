import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CompetencyBreakdownCard } from "@/components/reports/individual/competency-breakdown-card"
import { IndividualReportHeader } from "@/components/reports/individual/individual-report-header"
import { ItemizedAnswersTable } from "@/components/reports/individual/itemized-answers-table"
import { PrintReportButton } from "@/components/reports/individual/print-report-button"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import { getStudentIndividualReport } from "@/lib/reports/individual-queries"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/reports/individual"

export default async function StudentIndividualTranscriptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)
  const effectivePermissions = await getUserEffectivePermissions(
    session.user.id
  )

  const isAuthorized =
    (role && userHasPermission(role, BASE_PATH)) ||
    (effectivePermissions && userHasPermission(effectivePermissions, BASE_PATH))

  if (!isAuthorized) {
    redirect("/dashboard/forbidden")
  }

  const { attemptId } = await params
  const report = await getStudentIndividualReport(attemptId)

  if (!report) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6 print:gap-4 print:p-0">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center print:hidden">
        <Button asChild variant="ghost" size="sm" className="w-fit text-xs">
          <Link href="/dashboard/reports/individual">
            <ArrowLeftIcon className="mr-1.5 h-4 w-4" />
            Kembali ke Daftar Laporan Peserta
          </Link>
        </Button>

        <PrintReportButton />
      </div>

      {/* 1. Header & Student Profile */}
      <IndividualReportHeader report={report} />

      {/* 2. Competency / Subject Mastery Analysis */}
      <CompetencyBreakdownCard competencies={report.competencies} />

      {/* 3. Detailed Itemized Questions & Answers */}
      <ItemizedAnswersTable questions={report.questions} />

      {/* 4. Official Academic Validation Footer (For Print Media) */}
      <div className="hidden border-t-2 border-neutral-300 pt-6 text-xs text-neutral-800 print:mt-8 print:block print:break-inside-avoid">
        <div className="flex justify-between">
          <div className="space-y-1">
            <p className="font-semibold">Catatan:</p>
            <p>1. Dokumen ini merupakan bukti sah hasil asesmen ujian peserta.</p>
            <p>2. Dihasilkan secara otomatis oleh Exam Management System.</p>
          </div>
          <div className="flex flex-col items-center justify-end text-center">
            <p className="mb-14">Penguji / Pengawas Ujian,</p>
            <p className="border-b border-black font-semibold">( ........................................ )</p>
          </div>
        </div>
      </div>
    </div>
  )
}
