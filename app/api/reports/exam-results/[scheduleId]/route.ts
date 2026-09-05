import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { getUserEffectivePermissions } from "@/lib/auth/rbac-queries"
import { exportReportBuffer } from "@/lib/reports/export"
import { getScheduleReportData } from "@/lib/reports/queries"

const REPORTS_PATH = "/dashboard/reports/exam-results"

export async function GET(
  request: Request,
  props: { params: Promise<{ scheduleId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  const [role] = getAppRoles(session.user.role)
  const effectivePermissions = await getUserEffectivePermissions(session.user.id)

  const isAuthorized =
    (role && userHasPermission(role, REPORTS_PATH)) ||
    (effectivePermissions && userHasPermission(effectivePermissions, REPORTS_PATH))

  if (!isAuthorized) {
    return new Response("Forbidden", { status: 403 })
  }

  const { scheduleId } = await props.params
  const url = new URL(request.url)
  const formatParam = url.searchParams.get("format")?.toLowerCase()
  const format: "xlsx" | "csv" = formatParam === "csv" ? "csv" : "xlsx"

  const reportData = await getScheduleReportData(scheduleId)
  if (!reportData) {
    return new Response("Exam schedule report not found", { status: 404 })
  }

  const { buffer, contentType, filename } = await exportReportBuffer(
    reportData,
    format
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
