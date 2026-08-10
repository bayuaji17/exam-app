import { describe, expect, it } from "vitest"

import { APP_ROLES } from "@/lib/auth-roles"
import { userHasPermission } from "@/lib/auth/permissions"
describe("dashboard route permissions", () => {
  describe("a regular user", () => {
    const role = APP_ROLES.USER

    it("can reach the dashboard overview and their own account pages", () => {
      expect(userHasPermission(role, "/dashboard")).toBe(true)
      expect(userHasPermission(role, "/dashboard/settings")).toBe(true)
      expect(userHasPermission(role, "/dashboard/profile")).toBe(true)
    })

    it("cannot reach user management", () => {
      expect(userHasPermission(role, "/dashboard/users")).toBe(false)
      expect(userHasPermission(role, "/dashboard/user-groups")).toBe(false)
      expect(userHasPermission(role, "/dashboard/roles")).toBe(false)
    })

    it("cannot reach admin management", () => {
      expect(userHasPermission(role, "/dashboard/admins")).toBe(false)
    })

    it("cannot reach exam management, grading, monitoring, or reports", () => {
      expect(userHasPermission(role, "/dashboard/question-banks")).toBe(false)
      expect(userHasPermission(role, "/dashboard/exams")).toBe(false)
      expect(userHasPermission(role, "/dashboard/manual-grading")).toBe(false)
      expect(userHasPermission(role, "/dashboard/anti-cheat")).toBe(false)
      expect(userHasPermission(role, "/dashboard/reports/individual")).toBe(
        false
      )
    })
  })

  describe("an admin", () => {
    const role = APP_ROLES.ADMIN

    it("inherits everything a regular user can reach", () => {
      expect(userHasPermission(role, "/dashboard")).toBe(true)
      expect(userHasPermission(role, "/dashboard/settings")).toBe(true)
      expect(userHasPermission(role, "/dashboard/profile")).toBe(true)
    })

    it("can reach user management, exams, grading, monitoring, and reports", () => {
      expect(userHasPermission(role, "/dashboard/users")).toBe(true)
      expect(userHasPermission(role, "/dashboard/user-groups")).toBe(true)
      expect(userHasPermission(role, "/dashboard/roles")).toBe(true)
      expect(userHasPermission(role, "/dashboard/question-banks")).toBe(true)
      expect(userHasPermission(role, "/dashboard/exam-sessions")).toBe(true)
      expect(userHasPermission(role, "/dashboard/scoring-rules")).toBe(true)
      expect(userHasPermission(role, "/dashboard/activity-tracking")).toBe(true)
      expect(userHasPermission(role, "/dashboard/reports/sessions")).toBe(true)
    })

    it("cannot reach admin management", () => {
      expect(userHasPermission(role, "/dashboard/admins")).toBe(false)
    })

    it("cannot reach platform configuration", () => {
      expect(userHasPermission(role, "/dashboard/settings/system")).toBe(false)
    })
  })

  describe("a super admin", () => {
    const role = APP_ROLES.SUPER_ADMIN

    it("can reach every dashboard route including admin management", () => {
      expect(userHasPermission(role, "/dashboard")).toBe(true)
      expect(userHasPermission(role, "/dashboard/settings")).toBe(true)
      expect(userHasPermission(role, "/dashboard/users")).toBe(true)
      expect(userHasPermission(role, "/dashboard/admins")).toBe(true)
      expect(userHasPermission(role, "/dashboard/settings/system")).toBe(true)
      expect(userHasPermission(role, "/dashboard/exams")).toBe(true)
      expect(userHasPermission(role, "/dashboard/reports/exam-results")).toBe(
        true
      )
    })
  })

  describe("nested routes", () => {
    it("inherit the permission of their section", () => {
      expect(
        userHasPermission(APP_ROLES.ADMIN, "/dashboard/exams/abc-123/edit")
      ).toBe(true)
      expect(
        userHasPermission(APP_ROLES.USER, "/dashboard/exams/abc-123/edit")
      ).toBe(false)
      expect(
        userHasPermission(APP_ROLES.ADMIN, "/dashboard/users/xyz-789/edit")
      ).toBe(true)
      expect(
        userHasPermission(APP_ROLES.USER, "/dashboard/settings/security/sessions")
      ).toBe(true)
      // The platform-configuration child overrides the account-settings prefix
      // for the roles that must not reach it.
      expect(
        userHasPermission(APP_ROLES.USER, "/dashboard/settings/system")
      ).toBe(false)
    })

    it("does not treat a longer sibling segment as a nested route", () => {
      expect(userHasPermission(APP_ROLES.USER, "/dashboard/users-export")).toBe(
        false
      )
      expect(
        userHasPermission(APP_ROLES.ADMIN, "/dashboard/admins-audit")
      ).toBe(false)
    })
  })

  describe("unknown routes", () => {
    it("are denied for every role, so a typo cannot grant access", () => {
      expect(userHasPermission(APP_ROLES.USER, "/dashboard/nope")).toBe(false)
      expect(userHasPermission(APP_ROLES.ADMIN, "/dashboard/nope")).toBe(false)
      expect(userHasPermission(APP_ROLES.SUPER_ADMIN, "/dashboard/nope")).toBe(
        false
      )
    })

    it("are denied when the route is malformed or empty", () => {
      expect(userHasPermission(APP_ROLES.SUPER_ADMIN, "")).toBe(false)
      expect(userHasPermission(APP_ROLES.SUPER_ADMIN, "dashboard")).toBe(false)
      expect(userHasPermission(APP_ROLES.SUPER_ADMIN, "/")).toBe(false)
    })
  })

  describe("the forbidden page", () => {
    it("is reachable by every role, so the guard cannot redirect in a loop", () => {
      expect(userHasPermission(APP_ROLES.USER, "/dashboard/forbidden")).toBe(
        true
      )
      expect(userHasPermission(APP_ROLES.ADMIN, "/dashboard/forbidden")).toBe(
        true
      )
      expect(
        userHasPermission(APP_ROLES.SUPER_ADMIN, "/dashboard/forbidden")
      ).toBe(true)
    })
  })
})
