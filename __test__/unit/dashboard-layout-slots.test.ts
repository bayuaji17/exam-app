import { describe, expect, it, vi, beforeEach } from "vitest"
import { redirect } from "next/navigation"
import { AppSidebarSlot } from "@/components/dashboard-components/sidebar-dashboard-slot"
import { DashboardProfileMenuSlot } from "@/components/dashboard-components/dashboard-profile-menu-slot"
import { getDashboardSession } from "@/lib/auth/session"
import { APP_ROLES } from "@/lib/auth-roles"

const getUserEffectivePermissionsMock = vi.fn()

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  usePathname: () => "/dashboard",
}))

vi.mock("@/lib/auth/session", () => ({
  getDashboardSession: vi.fn(),
}))

vi.mock("@/lib/auth/rbac-queries", () => ({
  getUserEffectivePermissions: (userId: string) =>
    getUserEffectivePermissionsMock(userId),
}))

describe("Dashboard Layout Slots", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserEffectivePermissionsMock.mockResolvedValue([])
  })

  describe("AppSidebarSlot", () => {
    it("redirects to /login when session is missing", async () => {
      vi.mocked(getDashboardSession).mockResolvedValueOnce({
        session: null,
        pathname: "/dashboard",
      })

      const element = await AppSidebarSlot()
      expect(redirect).toHaveBeenCalledWith("/login")
      expect(element).toBeNull()
    })

    it("redirects to /login when user role is unrecognized", async () => {
      vi.mocked(getDashboardSession).mockResolvedValueOnce({
        session: {
          user: {
            id: "u1",
            role: "unknown_role",
            name: "Test",
            email: "test@example.com",
            displayUsername: "test",
            username: "test",
            image: null,
          },
        } as never,
        pathname: "/dashboard",
      })

      const element = await AppSidebarSlot()
      expect(redirect).toHaveBeenCalledWith("/login")
      expect(element).toBeNull()
    })

    it("redirects to /dashboard/forbidden when user lacks permission for pathname", async () => {
      vi.mocked(getDashboardSession).mockResolvedValueOnce({
        session: {
          user: {
            id: "u1",
            role: APP_ROLES.USER,
            name: "Test",
            email: "test@example.com",
            displayUsername: "test",
            username: "test",
            image: null,
          },
        } as never,
        pathname: "/dashboard/admins", // User lacks SYSTEM_SETTINGS_READ permission
      })
      getUserEffectivePermissionsMock.mockResolvedValueOnce([])

      const element = await AppSidebarSlot()
      expect(redirect).toHaveBeenCalledWith("/dashboard/forbidden")
      expect(element).toBeNull()
    })

    it("renders AppSidebar with user role and permissions when authorized", async () => {
      vi.mocked(getDashboardSession).mockResolvedValueOnce({
        session: {
          user: {
            id: "u1",
            role: APP_ROLES.ADMIN,
            name: "Admin",
            email: "admin@example.com",
            displayUsername: "admin",
            username: "admin",
            image: null,
          },
        } as never,
        pathname: "/dashboard",
      })
      getUserEffectivePermissionsMock.mockResolvedValueOnce(["*"])

      const element = await AppSidebarSlot()
      expect(element).not.toBeNull()
      expect(element?.props.role).toBe(APP_ROLES.ADMIN)
      expect(element?.props.permissions).toEqual(["*"])
    })
  })

  describe("DashboardProfileMenuSlot", () => {
    it("redirects to /login when session is missing", async () => {
      vi.mocked(getDashboardSession).mockResolvedValueOnce({
        session: null,
        pathname: "/dashboard",
      })

      const element = await DashboardProfileMenuSlot()
      expect(redirect).toHaveBeenCalledWith("/login")
      expect(element).toBeNull()
    })

    it("renders DashboardProfileMenu with user props when session exists", async () => {
      vi.mocked(getDashboardSession).mockResolvedValueOnce({
        session: {
          user: {
            id: "u1",
            role: APP_ROLES.SUPER_ADMIN,
            name: "Super Admin",
            email: "super@example.com",
            displayUsername: "superadmin",
            username: "superadmin",
            image: "https://example.com/avatar.png",
          },
        } as never,
        pathname: "/dashboard",
      })

      const element = await DashboardProfileMenuSlot()
      expect(element).not.toBeNull()
      expect(element?.props.user).toEqual({
        name: "Super Admin",
        email: "super@example.com",
        image: "https://example.com/avatar.png",
        username: "superadmin",
        displayUsername: "superadmin",
        role: APP_ROLES.SUPER_ADMIN,
      })
    })
  })
})
