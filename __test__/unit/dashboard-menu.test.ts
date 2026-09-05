import { describe, expect, it } from "vitest"

import { APP_ROLES } from "@/lib/auth-roles"
import { PERMISSIONS } from "@/lib/auth/permissions-catalog"
import { userHasPermission } from "@/lib/auth/permissions"
import { DASHBOARD_MENU, getVisibleMenu } from "@/lib/dashboard/menu"

function groupTitles(role: Parameters<typeof getVisibleMenu>[0]) {
  return getVisibleMenu(role).map((group) => group.title)
}

function itemUrls(role: Parameters<typeof getVisibleMenu>[0]) {
  return getVisibleMenu(role).flatMap((group) =>
    group.items.map((item) => item.url)
  )
}

describe("dashboard menu visibility", () => {
  describe("a regular user", () => {
    const role = APP_ROLES.USER

    it("sees only the sections containing routes they may open", () => {
      expect(groupTitles(role)).toEqual(["Overview", "Pengaturan"])
    })

    it("sees the overview and account settings links", () => {
      expect(itemUrls(role)).toEqual([
        "/dashboard",
        "/dashboard/settings/profile",
        "/dashboard/settings/security",
      ])
    })

    it("sees no platform configuration link", () => {
      expect(itemUrls(role)).not.toContain("/dashboard/settings/system")
    })

    it("sees no administrative links", () => {
      const urls = itemUrls(role)

      expect(urls).not.toContain("/dashboard/users")
      expect(urls).not.toContain("/dashboard/admins")
      expect(urls).not.toContain("/dashboard/question-banks")
      expect(urls).not.toContain("/dashboard/reports/individual")
    })
  })

  describe("an admin", () => {
    const role = APP_ROLES.ADMIN

    it("sees the management, grading, monitoring and reporting sections", () => {
      expect(groupTitles(role)).toEqual([
        "Overview",
        "Manajemen Pengguna",
        "Manajemen Ujian",
        "Penilaian",
        "Monitoring",
        "Laporan",
        "Pengaturan",
      ])
    })

    it("sees user management but not the admin roster link", () => {
      const urls = itemUrls(role)

      expect(urls).toContain("/dashboard/users")
      expect(urls).toContain("/dashboard/user-groups")
      expect(urls).toContain("/dashboard/roles")
      expect(urls).not.toContain("/dashboard/admins")
    })

    it("sees account settings but not the platform configuration link", () => {
      const urls = itemUrls(role)

      expect(urls).toContain("/dashboard/settings/profile")
      expect(urls).toContain("/dashboard/settings/security")
      expect(urls).not.toContain("/dashboard/settings/system")
    })

    it("keeps the group that contains the hidden admin link, minus that link", () => {
      const group = getVisibleMenu(role).find(
        (candidate) => candidate.title === "Manajemen Pengguna"
      )

      expect(group?.items).toHaveLength(3)
    })
  })

  describe("a super admin", () => {
    const role = APP_ROLES.SUPER_ADMIN

    it("sees every section", () => {
      expect(groupTitles(role)).toEqual(
        DASHBOARD_MENU.map((group) => group.title)
      )
    })

    it("sees every link, including the admin roster", () => {
      const urls = itemUrls(role)

      expect(urls).toContain("/dashboard/admins")
      expect(urls).toContain("/dashboard/settings/system")
      expect(urls).toHaveLength(
        DASHBOARD_MENU.flatMap((group) => group.items).length
      )
    })
  })

  describe("custom permission sets", () => {
    it("renders only question-banks and overview for a teacher role with question_banks:read", () => {
      const teacherPermissions = [PERMISSIONS.QUESTION_BANKS_READ]
      const urls = itemUrls(teacherPermissions)

      expect(urls).toContain("/dashboard")
      expect(urls).toContain("/dashboard/question-banks")
      expect(urls).toContain("/dashboard/settings/profile")
      expect(urls).not.toContain("/dashboard/users")
      expect(urls).not.toContain("/dashboard/roles")
      expect(urls).not.toContain("/dashboard/exams")
    })

    it("renders user-management and roles for a user manager role", () => {
      const managerPermissions = [
        PERMISSIONS.USERS_READ,
        PERMISSIONS.ROLES_READ,
      ]
      const urls = itemUrls(managerPermissions)

      expect(urls).toContain("/dashboard/users")
      expect(urls).toContain("/dashboard/roles")
      expect(urls).not.toContain("/dashboard/admins")
      expect(urls).not.toContain("/dashboard/question-banks")
    })
  })

  describe("empty groups", () => {
    it("are dropped rather than rendered as bare headings", () => {
      for (const group of getVisibleMenu(APP_ROLES.USER)) {
        expect(group.items.length).toBeGreaterThan(0)
      }

      for (const group of getVisibleMenu(APP_ROLES.ADMIN)) {
        expect(group.items.length).toBeGreaterThan(0)
      }
    })
  })

  describe("every visible link", () => {
    it("is one the role is actually permitted to open", () => {
      for (const role of Object.values(APP_ROLES)) {
        for (const url of itemUrls(role)) {
          expect(userHasPermission(role, url)).toBe(true)
        }
      }
    })
  })

  describe("the source menu", () => {
    it("is left untouched, so filtering one role cannot affect another", () => {
      const before = JSON.stringify(DASHBOARD_MENU)

      getVisibleMenu(APP_ROLES.USER)
      getVisibleMenu(APP_ROLES.ADMIN)

      expect(JSON.stringify(DASHBOARD_MENU)).toBe(before)
    })
  })
})
