"use server"

import { randomUUID } from "node:crypto"
import ExcelJS from "exceljs"
import { hashPassword } from "better-auth/crypto"
import { eq, sql } from "drizzle-orm"

import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { requirePermission } from "@/lib/auth/rbac-guards"
import { db } from "@/lib/db"
import {
  account,
  participantGroup,
  participantGroupMember,
  participantImport,
  role,
  user,
  userRole,
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
  const { user: actor } = await requirePermission(PERMISSIONS.USERS_IMPORT)
  return actor.id
}

/**
 * The database context validation needs: existing emails (dedupe) and group
 * names (assignment).
 */
async function loadImportContext(): Promise<{
  existingEmails: Set<string>
  existingNisns: Set<number>
  existingNis: Set<string>
  groupsByName: Map<string, string>
}> {
  const [emails, nisns, nis, groups] = await Promise.all([
    db.select({ email: sql<string>`lower(${user.email})` }).from(user),
    db
      .select({ nisn: user.nisn })
      .from(user)
      .where(sql`${user.nisn} is not null`),
    db
      .select({ nis: user.nis })
      .from(user)
      .where(sql`${user.nis} is not null`),
    db
      .select({ id: participantGroup.id, name: participantGroup.name })
      .from(participantGroup),
  ])

  return {
    existingEmails: new Set(emails.map((row) => row.email)),
    existingNisns: new Set(nisns.map((row) => row.nisn as number)),
    existingNis: new Set(nis.map((row) => row.nis as string)),
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
      const value =
        cell.value !== null && cell.value !== undefined
          ? String(cell.value).trim()
          : ""
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
    return {
      ok: false,
      message: `Maksimal ${IMPORT_MAX_ROWS} baris peserta per file.`,
    }
  }

  const { existingEmails, existingNisns, existingNis, groupsByName } =
    await loadImportContext()

  return {
    ok: true,
    plan: validateImportPlan(
      rows,
      existingEmails,
      existingNisns,
      existingNis,
      new Set(groupsByName.keys())
    ),
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

  const { existingEmails, existingNisns, existingNis, groupsByName } =
    await loadImportContext()
  const revalidated = validateImportPlan(
    plan.rows,
    existingEmails,
    existingNisns,
    existingNis,
    new Set(groupsByName.keys())
  )

  if (!revalidated.valid) {
    return {
      ok: false,
      message: "File mengandung data tidak valid. Perbaiki dan ulangi.",
    }
  }

  // Generate missing passwords up front so they can be shown once in the
  // result; they are never stored in plaintext.
  const generatedPasswords = new Map<string, string>()

  for (const row of revalidated.rows) {
    if (!row.password) {
      generatedPasswords.set(row.email, generatePassword())
    }
  }

  // Fetch default "user" role for RBAC assignment
  const [defaultRole] = await db
    .select({ id: role.id })
    .from(role)
    .where(eq(role.slug, "user"))
    .limit(1)

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
          nisn: row.nisn,
          nis: row.nis,
        })

        if (defaultRole?.id) {
          await tx.insert(userRole).values({
            userId: id,
            roleId: defaultRole.id,
          })
        }

        await tx.insert(account).values({
          id: randomUUID(),
          // Matches the 1.7 local-issuer convention the dev DB migrated to
          // (createLocalAccountIssuer("credential") on the upgrade branch).
          issuer: "local:credential",
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
