import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"

/**
 * Scope to the sidebar: several link names ("Dashboard", "Admin") also appear
 * in the breadcrumb or page body, so an unscoped lookup matches more than one
 * element.
 */
function sidebar(page: Page) {
  return page.locator('[data-slot="sidebar"]')
}

function sidebarLink(page: Page, name: string) {
  return sidebar(page).getByRole("link", { name, exact: true })
}

function sidebarGroup(page: Page, name: string) {
  return sidebar(page).getByRole("button", { name, exact: true })
}

test.describe("sidebar visibility by role", () => {
  test("a regular user sees only the overview and account sections", async ({
    page,
  }) => {
    await signInAsRole(page, "user")
    await page.goto("/dashboard")

    await expect(sidebarGroup(page, "Overview")).toBeVisible()
    await expect(sidebarGroup(page, "Pengaturan")).toBeVisible()

    await expect(sidebarGroup(page, "Manajemen Pengguna")).toHaveCount(0)
    await expect(sidebarGroup(page, "Manajemen Ujian")).toHaveCount(0)
    await expect(sidebarGroup(page, "Penilaian")).toHaveCount(0)
    await expect(sidebarGroup(page, "Monitoring")).toHaveCount(0)
    await expect(sidebarGroup(page, "Laporan")).toHaveCount(0)
  })

  test("a regular user sees no administrative links", async ({ page }) => {
    await signInAsRole(page, "user")
    await page.goto("/dashboard")

    await expect(sidebarLink(page, "Peserta")).toHaveCount(0)
    await expect(sidebarLink(page, "Admin")).toHaveCount(0)
    await expect(sidebarLink(page, "Bank Soal")).toHaveCount(0)
    await expect(sidebarLink(page, "Laporan Individu")).toHaveCount(0)
  })

  test("an admin sees the management sections but not the admin roster link", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await page.goto("/dashboard")

    await expect(sidebarGroup(page, "Manajemen Pengguna")).toBeVisible()
    await expect(sidebarGroup(page, "Manajemen Ujian")).toBeVisible()
    await expect(sidebarGroup(page, "Laporan")).toBeVisible()

    await expect(sidebarLink(page, "Peserta")).toBeVisible()
    await expect(sidebarLink(page, "Grup Peserta")).toBeVisible()
    await expect(sidebarLink(page, "Role & Hak Akses")).toBeVisible()
    await expect(sidebarLink(page, "Admin")).toHaveCount(0)
  })

  test("a super-admin sees every section including the admin roster", async ({
    page,
  }) => {
    await signInAsRole(page, "super-admin")
    await page.goto("/dashboard")

    await expect(sidebarGroup(page, "Manajemen Pengguna")).toBeVisible()
    await expect(sidebarLink(page, "Admin")).toBeVisible()
    await expect(sidebarLink(page, "Peserta")).toBeVisible()
    await expect(sidebarLink(page, "Bank Soal")).toBeVisible()
    await expect(sidebarLink(page, "Laporan Individu")).toBeVisible()
  })

  test("the account settings links stay visible for every role", async ({
    page,
  }) => {
    for (const role of ["user", "admin", "super-admin"] as const) {
      await page.context().clearCookies()
      await signInAsRole(page, role)
      await page.goto("/dashboard")

      await expect(sidebarLink(page, "Profile")).toBeVisible()
      await expect(sidebarLink(page, "Security")).toBeVisible()
    }
  })

  test("the platform configuration link is super-admin only", async ({
    page,
  }) => {
    for (const role of ["user", "admin"] as const) {
      await page.context().clearCookies()
      await signInAsRole(page, role)
      await page.goto("/dashboard")

      await expect(sidebarLink(page, "Konfigurasi Global")).toHaveCount(0)
    }

    await page.context().clearCookies()
    await signInAsRole(page, "super-admin")
    await page.goto("/dashboard")

    await expect(sidebarLink(page, "Konfigurasi Global")).toBeVisible()
  })

  test("active route highlighting still works on the remaining links", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")

    await expect(sidebarLink(page, "Peserta")).toHaveAttribute(
      "data-active",
      "true"
    )
    await expect(sidebarLink(page, "Dashboard")).not.toHaveAttribute(
      "data-active",
      "true"
    )
  })

  test("no empty group headings are rendered for a regular user", async ({
    page,
  }) => {
    await signInAsRole(page, "user")
    await page.goto("/dashboard")

    const groupLabels = page.locator('[data-slot="sidebar-group-label"]')

    await expect(groupLabels).toHaveCount(2)
  })
})
