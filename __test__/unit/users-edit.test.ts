import { describe, expect, it } from "vitest"

import { APP_ROLES, type AppRole } from "@/lib/auth-roles"
import {
  BAN_DURATION_PRESETS,
  banDurationToSeconds,
  canBanUser,
  canChangeRole,
  canEditUser,
  canRemoveUser,
  formatBanExpiry,
} from "@/lib/users/edit"

const ALL_ROLES: AppRole[] = Object.values(APP_ROLES)

function actor(role: AppRole, id = "actor-1") {
  return { id, role }
}

function target(role: AppRole, id = "target-1") {
  return { id, role }
}

describe("banDurationToSeconds", () => {
  it("gives no expiry for a permanent ban, so Better Auth leaves banExpires null", () => {
    expect(banDurationToSeconds({ kind: "permanent" })).toBeUndefined()
  })

  it("converts each preset to seconds", () => {
    expect(banDurationToSeconds({ kind: "preset", preset: "1-hour" })).toBe(3600)
    expect(banDurationToSeconds({ kind: "preset", preset: "24-hours" })).toBe(
      86_400
    )
    expect(banDurationToSeconds({ kind: "preset", preset: "7-days" })).toBe(
      604_800
    )
    expect(banDurationToSeconds({ kind: "preset", preset: "30-days" })).toBe(
      2_592_000
    )
  })

  it("converts a custom number of days to seconds", () => {
    expect(banDurationToSeconds({ kind: "custom", days: 1 })).toBe(86_400)
    expect(banDurationToSeconds({ kind: "custom", days: 3 })).toBe(259_200)
  })

  it("exposes every preset with a label, so the UI cannot drift from the values", () => {
    const keys = BAN_DURATION_PRESETS.map((preset) => preset.value)

    expect(keys).toEqual(["1-hour", "24-hours", "7-days", "30-days"])

    for (const preset of BAN_DURATION_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0)
      expect(banDurationToSeconds({ kind: "preset", preset: preset.value })).toBe(
        preset.seconds
      )
    }
  })
})

describe("formatBanExpiry", () => {
  const now = new Date("2026-08-09T08:00:00.000Z")

  it("previews when a temporary ban lifts", () => {
    expect(formatBanExpiry(604_800, now)).toBe("16 Aug 2026, 08.00")
  })

  it("previews an hour-long ban", () => {
    expect(formatBanExpiry(3600, now)).toBe("09 Aug 2026, 09.00")
  })

  it("has nothing to preview for a permanent ban", () => {
    expect(formatBanExpiry(undefined, now)).toBeNull()
  })

  it("formats in a fixed zone, so the preview does not shift with the server", () => {
    // 23:30 UTC is already tomorrow in Jakarta; pinning the zone keeps the
    // preview identical wherever this runs.
    const lateEvening = new Date("2026-08-09T23:30:00.000Z")

    expect(formatBanExpiry(3600, lateEvening)).toBe("10 Aug 2026, 00.30")
  })
})

describe("canChangeRole", () => {
  it("lets a super admin change a regular user's role", () => {
    expect(
      canChangeRole(actor(APP_ROLES.SUPER_ADMIN), target(APP_ROLES.USER))
    ).toBe(true)
  })

  it("lets a super admin demote an admin", () => {
    expect(
      canChangeRole(actor(APP_ROLES.SUPER_ADMIN), target(APP_ROLES.ADMIN))
    ).toBe(true)
  })

  it("stops an admin changing anyone's role", () => {
    for (const role of ALL_ROLES) {
      expect(canChangeRole(actor(APP_ROLES.ADMIN), target(role))).toBe(false)
    }
  })

  it("stops a regular user changing anyone's role", () => {
    for (const role of ALL_ROLES) {
      expect(canChangeRole(actor(APP_ROLES.USER), target(role))).toBe(false)
    }
  })

  it("stops a super admin changing another super admin's role", () => {
    expect(
      canChangeRole(actor(APP_ROLES.SUPER_ADMIN), target(APP_ROLES.SUPER_ADMIN))
    ).toBe(false)
  })

  it("stops anyone demoting themselves", () => {
    const same = { id: "same-id", role: APP_ROLES.SUPER_ADMIN }

    expect(canChangeRole(same, same)).toBe(false)
  })
})

describe("canBanUser", () => {
  it("lets a super admin ban an admin", () => {
    expect(
      canBanUser(actor(APP_ROLES.SUPER_ADMIN), target(APP_ROLES.ADMIN))
    ).toBe(true)
  })

  it("lets an admin ban a regular user", () => {
    expect(canBanUser(actor(APP_ROLES.ADMIN), target(APP_ROLES.USER))).toBe(
      true
    )
  })

  it("stops an admin banning a super admin, which would lock the platform out", () => {
    expect(
      canBanUser(actor(APP_ROLES.ADMIN), target(APP_ROLES.SUPER_ADMIN))
    ).toBe(false)
  })

  it("stops a super admin banning another super admin", () => {
    expect(
      canBanUser(actor(APP_ROLES.SUPER_ADMIN), target(APP_ROLES.SUPER_ADMIN))
    ).toBe(false)
  })

  it("stops a regular user banning anyone", () => {
    for (const role of ALL_ROLES) {
      expect(canBanUser(actor(APP_ROLES.USER), target(role))).toBe(false)
    }
  })

  it("stops anyone banning themselves", () => {
    const same = { id: "same-id", role: APP_ROLES.ADMIN }

    expect(canBanUser(same, same)).toBe(false)
  })
})

describe("canRemoveUser", () => {
  // No UI ships for removal yet, but granting the `delete` permission made
  // `/admin/remove-user` reachable, so the rule is pinned down now.
  it("lets a super admin remove an admin", () => {
    expect(
      canRemoveUser(actor(APP_ROLES.SUPER_ADMIN), target(APP_ROLES.ADMIN))
    ).toBe(true)
  })

  it("lets an admin remove a regular user", () => {
    expect(canRemoveUser(actor(APP_ROLES.ADMIN), target(APP_ROLES.USER))).toBe(
      true
    )
  })

  it("stops anyone removing a super admin", () => {
    for (const role of ALL_ROLES) {
      expect(canRemoveUser(actor(role), target(APP_ROLES.SUPER_ADMIN))).toBe(
        false
      )
    }
  })

  it("stops anyone removing themselves", () => {
    const same = { id: "same-id", role: APP_ROLES.ADMIN }

    expect(canRemoveUser(same, same)).toBe(false)
  })

  it("stops a regular user removing anyone", () => {
    for (const role of ALL_ROLES) {
      expect(canRemoveUser(actor(APP_ROLES.USER), target(role))).toBe(false)
    }
  })
})

describe("canEditUser", () => {
  it("is true when at least one action is available", () => {
    expect(canEditUser(actor(APP_ROLES.ADMIN), target(APP_ROLES.USER))).toBe(
      true
    )
    expect(
      canEditUser(actor(APP_ROLES.SUPER_ADMIN), target(APP_ROLES.ADMIN))
    ).toBe(true)
  })

  it("is false for a super admin target, who cannot be edited at all", () => {
    for (const role of ALL_ROLES) {
      expect(canEditUser(actor(role), target(APP_ROLES.SUPER_ADMIN))).toBe(
        false
      )
    }
  })

  it("is false for your own account", () => {
    const same = { id: "same-id", role: APP_ROLES.SUPER_ADMIN }

    expect(canEditUser(same, same)).toBe(false)
  })

  it("is false for a regular user, who has no management rights", () => {
    for (const role of ALL_ROLES) {
      expect(canEditUser(actor(APP_ROLES.USER), target(role))).toBe(false)
    }
  })
})
