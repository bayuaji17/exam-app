import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ExamIntroductionForm } from "@/components/exam-introduction-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getExamScheduleBySlug } from "@/lib/entity-slugs/resolvers"
import type { TipTapDoc } from "@/lib/content-policy"

const BASE_PATH = "/dashboard/exam-introductions"

export default async function ExamIntroductionEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, BASE_PATH)) {
    redirect("/dashboard/forbidden")
  }

  const schedule = await getExamScheduleBySlug(slug)

  if (!schedule) {
    notFound()
  }

  if (slug !== schedule.slug && slug === schedule.id) {
    redirect(`${BASE_PATH}/${schedule.slug}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        href={BASE_PATH}
      >
        ← Kembali ke Introduction Ujian
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Introduction · {schedule.name}</h1>
        <p className="text-sm text-muted-foreground">
          Teks ini ditampilkan di halaman pengantar sebelum peserta mulai
          mengerjakan ujian. Kosongkan untuk menggunakan teks default.
        </p>
      </div>

      <ExamIntroductionForm
        initialContent={(schedule.introduction as TipTapDoc | null) ?? null}
        scheduleId={schedule.id}
      />
    </div>
  )
}
