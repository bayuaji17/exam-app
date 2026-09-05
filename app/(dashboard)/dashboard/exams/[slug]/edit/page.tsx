import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"

import { ExamPackageForm } from "@/components/exam-package-form"
import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getExamPackageBySlug } from "@/lib/entity-slugs/resolvers"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false

const BASE_PATH = "/dashboard/exams"

export default async function EditExamPackagePage({
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

  const pkg = await getExamPackageBySlug(slug)

  if (!pkg) {
    notFound()
  }

  if (slug !== pkg.slug && slug === pkg.id) {
    redirect(`${BASE_PATH}/${pkg.slug}/edit`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Edit Paket Ujian</h1>
        <p className="text-sm text-muted-foreground">
          Ubah konfigurasi paket ujian.
        </p>
      </div>

      <ExamPackageForm
        pkg={{
          id: pkg.id,
          name: pkg.name,
          kodePaket: pkg.kodePaket,
          slug: pkg.slug,
          description: pkg.description,
          durationMinutes: pkg.durationMinutes,
          shuffle: pkg.shuffle,
          passScore: pkg.passScore,
          wrongPenalty: pkg.wrongPenalty,
        }}
      />
    </div>
  )
}
