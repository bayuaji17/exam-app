import { headers } from "next/headers"
import ExcelJS from "exceljs"

import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"

const USERS_PATH = "/dashboard/users"

/**
 * The downloadable import template: headers plus one example row. Auth-
 * gated, so the file is only served to users who can import.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return new Response(null, { status: 401 })
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, USERS_PATH)) {
    return new Response(null, { status: 403 })
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Peserta")

  sheet.columns = [
    { header: "Nama", key: "name", width: 28 },
    { header: "Email", key: "email", width: 34 },
    { header: "Username", key: "username", width: 20 },
    { header: "Kata Sandi", key: "password", width: 20 },
    { header: "Grup", key: "groups", width: 30 },
  ]

  sheet.addRow({
    name: "Contoh Nama",
    email: "contoh@example.com",
    username: "contohuser",
    password: "Rahasia123!",
    groups: "Kelas A, Kelas B",
  })

  const buffer = await workbook.xlsx.writeBuffer()

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-peserta.xlsx"',
    },
  })
}
