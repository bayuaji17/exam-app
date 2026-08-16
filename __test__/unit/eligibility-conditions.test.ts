import { describe, expect, it } from "vitest"
import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eligibleParticipantConditions } from "@/lib/eligibility/queries"

describe("eligibleParticipantConditions", () => {
  const query = () =>
    db
      .select()
      .from(user)
      .where(and(eq(user.id, "u1"), ...eligibleParticipantConditions("s1")))
      .toSQL()

  it("requires a non-banned user-role account", () => {
    const sql = query()

    expect(sql.sql).toContain('"user"."role"')
    expect(sql.params).toContain("user")
    expect(sql.sql).toContain('"user"."banned"')
    expect(sql.params).toContain(false)
  })

  it("grants access through the direct user grant", () => {
    const sql = query()

    expect(sql.sql).toContain('"schedule_user_eligibility"')
    expect(sql.sql).toContain(
      '"schedule_user_eligibility"."userId" = "user"."id"'
    )
  })

  it("grants access through membership in a granted group", () => {
    const sql = query()

    expect(sql.sql).toContain(
      '"schedule_group_eligibility" inner join "participant_group_member"'
    )
    expect(sql.sql).toContain('"participant_group_member"."userId" = "user"."id"')
  })

  it("unions the two grant paths under the role/banned guard", () => {
    const sql = query()

    // Both paths sit in one OR, and the whole invariant is AND-ed together so
    // an unrelated user is never selected.
    expect(sql.sql).toMatch(/where \(.* and .* and .* and \(.* or .*\)\)/)
  })
})
