import { describe, expect, it } from "vitest"

import { APP_ROLES } from "@/lib/auth-roles"
import { formatJoinedAt, formatRoleLabel } from "@/lib/users/format"

describe("formatRoleLabel", () => {
  it("renders the user role as a readable label", () => {
    expect(formatRoleLabel(APP_ROLES.USER)).toBe("User")
  })

  it("renders the admin role as a readable label", () => {
    expect(formatRoleLabel(APP_ROLES.ADMIN)).toBe("Admin")
  })

  it("expands the hyphenated super-admin role into two words", () => {
    expect(formatRoleLabel(APP_ROLES.SUPER_ADMIN)).toBe("Super Admin")
  })

  it("covers every role the app defines, so a new role cannot slip through", () => {
    for (const role of Object.values(APP_ROLES)) {
      expect(formatRoleLabel(role)).not.toBe("")
      expect(formatRoleLabel(role)).not.toContain("-")
    }
  })
})

describe("formatJoinedAt", () => {
  const joined = new Date("2026-08-02T09:30:00.000Z")

  it("renders a date as day, short month, and full year", () => {
    expect(formatJoinedAt(joined)).toBe("02 Aug 2026")
  })

  it("pads single-digit days so column width stays stable", () => {
    expect(formatJoinedAt(new Date("2026-01-05T00:00:00.000Z"))).toBe(
      "05 Jan 2026"
    )
  })

  it("formats in UTC, so the rendered date does not shift with server timezone", () => {
    // 23:30 UTC is already the next day in Jakarta (UTC+7). Pinning the zone
    // keeps the output identical wherever the server runs.
    const lateEvening = new Date("2026-08-02T23:30:00.000Z")

    expect(formatJoinedAt(lateEvening)).toBe("02 Aug 2026")
  })

  it("is stable across repeated calls", () => {
    expect(formatJoinedAt(joined)).toBe(formatJoinedAt(joined))
  })
})
