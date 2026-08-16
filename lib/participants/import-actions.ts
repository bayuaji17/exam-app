"use server"

import { randomUUID } from "node:crypto"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import ExcelJS from "exceljs"
import { hashPassword } from "better-auth/crypto"
import { sql } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { getAppRoles } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
import { db } from "@/lib/db"
import {
  account,
  participantGroup,
  participantGroupMember,
  participantImport,
  user,
} from "@/lib/db/schema"
import {
  generatePassword,
  IMPORT_ALLOWED_EXT,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  parseImportRow,
  validateImportPlan,
  type ImportPlan,
  type ImportRow,
} from "./import"

const USERS_PATH = "/dashboard/users"

export interface ParseImportResult {
  ok: true
  plan: ImportPlan
}

export interface ImportActionError {
  ok: false
  message: string
}

/**
 * A server action is an untrusted entry point: authenticate the caller and
 * authorize the route before touching the database.
 */
async function requireImportManager(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  const [role] = getAppRoles(session.user.role)

  if (!role || !userHasPermission(role, USERS_PATH)) {
    redirect("/dashboard/forbidden")
  }

  return session.user.id
}

/**
 * The database context validation needs: existing emails (dedupe) and group
 * names (assignment).
 */
async function loadImportContext(): Promise<{
  existingEmails: Set<string>
  groupsByName: Map<string, string>
}> {
  const [emails, groups] = await Promise.all([
    db.select({ email: sql<string>`lower(${user.email})` }).from(user),
    db
      .select({ id: participantGroup.id, name: participantGroup.name })
      .from(participantGroup),
  ])

  return {
    existingEmails: new Set(emails.map((row) => row.email)),
    groupsByName: new Map(
      groups.map((group) => [group.name.toLowerCase(), group.id])
    ),
  }
}

/**
 * Read the first worksheet into ImportRows, mapping cells by their header
 * names (row 1). Fully empty rows are skipped.
 */
async function readRowsFromWorkbook(buffer: Uint8Array): Promise<ImportRow[]> {
  const rows: ImportRow[] = []
  const workbook = new ExcelJS.Workbook()

  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]
  )

  const worksheet = workbook.worksheets[0]

  if (!worksheet) {
    return rows
  }

  const headerByColumn = new Map<number, string>()

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells: Record<string, unknown> = {}

    row.eachCell({ includeEmpty: true }, (cell) => {
      const value = cell.value !== null && cell.value !== undefined ? String(cell.value).trim() : ""
      const column = Number(cell.col)

      if (rowNumber === 1) {
        if (value) {
          headerByColumn.set(column, value)
        }
      } else {
        const header = headerByColumn.get(column)

        if (header) {
          cells[header] = cell.value
        }
      }
    })

    if (rowNumber === 1) {
      return
    }

    const parsed = parseImportRow(rowNumber, cells)

    if (
      !parsed.name &&
      !parsed.email &&
      !parsed.username &&
      !parsed.password &&
      parsed.groupNames.length === 0
    ) {
      return
    }

    rows.push(parsed)
  })

  return rows
}

/**
 * Phase one: read and validate the uploaded file, returning the dry-run
 * plan. Nothing is created here.
 */
export async function parseParticipantImportAction(
  file: File
): Promise<ParseImportResult | ImportActionError> {
  await requireImportManager()

  if (!file.name.toLowerCase().endsWith(IMPORT_ALLOWED_EXT)) {
    return { ok: false, message: "Hanya file .xlsx yang didukung." }
  }

  if (file.size > IMPORT_MAX_BYTES) {
    return { ok: false, message: "File maksimal 2 MB." }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let rows: ImportRow[]

  try {
    rows = await readRowsFromWorkbook(buffer)
  } catch {
    return { ok: false, message: "File Excel tidak dapat dibaca." }
  }

  if (rows.length === 0) {
    return { ok: false, message: "File tidak berisi data peserta." }
  }

  if (rows.length > IMPORT_MAX_ROWS) {
    return { ok: false, message: `Maksimal ${IMPORT_MAX_ROWS} baris peserta per file.` }
  }

  const { existingEmails, groupsByName } = await loadImportContext()

  return {
    ok: true,
    plan: validateImportPlan(rows, existingEmails, new Set(groupsByName.keys())),
  }
}

/**
 * Phase two: apply a validated plan atomically. The plan is re-validated
 * against a fresh database context — the client is never trusted — and the
 * whole batch (accounts, memberships, history row) commits or rolls back
 * together.
 */
export async function applyParticipantImportAction(
  plan: ImportPlan
): Promise<
  | { ok: true; created: number; generatedPasswords: Record<string, string> }
  | ImportActionError
> {
  const adminId = await requireImportManager()

  const { existingEmails, groupsByName } = await loadImportContext()
  const revalidated = validateImportPlan(
    plan.rows,
    existingEmails,
    new Set(groupsByName.keys())
  )

  if (!revalidated.valid) {
    return { ok: false, message: "File mengandung data tidak valid. Perbaiki dan ulangi." }
  }

  // Generate missing passwords up front so they can be shown once in the
  // result; they are never stored in plaintext.
  const generatedPasswords = new Map<string, string>()

  for (const row of revalidated.rows) {
    if (!row.password) {
      generatedPasswords.set(row.email, generatePassword())
    }
  }

  try {
    await db.transaction(async (tx) => {
      for (const row of revalidated.rows) {
        const id = randomUUID()
        const password = generatedPasswords.get(row.email) ?? row.password!

        await tx.insert(user).values({
          id,
          name: row.name,
          email: row.email,
          emailVerified: true,
          role: "user",
          username: row.username,
          displayUsername: row.username,
        })

        await tx.insert(account).values({
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          userId: id,
          password: await hashPassword(password),
        })

        const groupIds = row.groupNames
          .map((name) => groupsByName.get(name.toLowerCase()))
          .filter((groupId): groupId is string => groupId !== undefined)

        for (const groupId of groupIds) {
          await tx.insert(participantGroupMember).values({
            id: randomUUID(),
            groupId,
            userId: id,
          })
        }
      }

      await tx.insert(participantImport).values({
        id: randomUUID(),
        adminId,
        fileName: `import-${Date.now()}.xlsx`,
        total: revalidated.rows.length,
        created: revalidated.rows.length,
      })
    })
  } catch (error) {
    // The transaction rolled back; surface a generic failure.
    console.error("participant import failed", error)

    return { ok: false, message: "Import gagal. Tidak ada data yang dibuat." }
  }

  return {
    ok: true,
    created: revalidated.rows.length,
    generatedPasswords: Object.fromEntries(generatedPasswords),
  }
}
