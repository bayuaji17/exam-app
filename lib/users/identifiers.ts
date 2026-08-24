import { and, eq, ne } from "drizzle-orm"

import { db } from "@/lib/db"
import { examPackage, user } from "@/lib/db/schema"
import type { IdentifierField } from "@/lib/identifiers"

/**
 * DB-backed uniqueness check for the identifier fields (implements the
 * `IdentifierTaken` contract). `excludeId` skips the row being edited so
 * keeping one's own value is never reported as taken.
 */
export async function identifierTaken(
  field: IdentifierField,
  value: string | number,
  excludeId?: string
): Promise<boolean> {
  switch (field) {
    case "kodePaket": {
      const [row] = await db
        .select({ id: examPackage.id })
        .from(examPackage)
        .where(
          and(
            eq(examPackage.kodePaket, String(value)),
            excludeId ? ne(examPackage.id, excludeId) : undefined
          )
        )
        .limit(1)

      return Boolean(row)
    }

    case "nisn": {
      const [row] = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.nisn, Number(value)),
            excludeId ? ne(user.id, excludeId) : undefined
          )
        )
        .limit(1)

      return Boolean(row)
    }

    case "nis": {
      const [row] = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.nis, String(value)),
            excludeId ? ne(user.id, excludeId) : undefined
          )
        )
        .limit(1)

      return Boolean(row)
    }

    case "nip": {
      const [row] = await db
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.nip, String(value)),
            excludeId ? ne(user.id, excludeId) : undefined
          )
        )
        .limit(1)

      return Boolean(row)
    }
  }
}
