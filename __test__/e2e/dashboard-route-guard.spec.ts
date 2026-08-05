import { expect, test } from "@playwright/test"

import { signOut, useRole } from "./fixtures/auth"

test.describe("dashboard route guard", () => {
  test("a regular user is sent to the forbidden page when opening user management", async ({
    page,
  }) => {
    await useRole(page, "user")
    await page.goto("/dashboard/users")

    await expect(page).toHaveURL(/\/dashboard\/forbidden$/)
    await expect(
      page.getByRole("heading", { name: "Access denied" })
    ).toBeVisible()
  })

  test("a regular user is sent to the forbidden page when opening admin management", async ({
    page,
  }) => {
    await useRole(page, "user")
    await page.goto("/dashboard/admins")

    await expect(page).toHaveURL(/\/dashboard\/forbidden$/)
  })

  test("an admin can open user management", async ({ page }) => {
    await useRole(page, "admin")
    await page.goto("/dashboard/users")

    await expect(page).toHaveURL(/\/dashboard\/users$/)
  })

  test("an admin is sent to the forbidden page when opening admin management", async ({
    page,
  }) => {
    await useRole(page, "admin")
    await page.goto("/dashboard/admins")

    await expect(page).toHaveURL(/\/dashboard\/forbidden$/)
  })

  test("a super-admin can open admin management", async ({ page }) => {
    await useRole(page, "super-admin")
    await page.goto("/dashboard/admins")

    await expect(page).toHaveURL(/\/dashboard\/admins$/)
  })

  test("every role can open the dashboard overview and account settings", async ({
    page,
  }) => {
    await useRole(page, "user")

    await page.goto("/dashboard/settings")
    await expect(page).toHaveURL(/\/dashboard\/settings$/)

    await page.goto("/dashboard/profile")
    await expect(page).toHaveURL(/\/dashboard\/profile$/)
  })

  test("nested routes under a restricted section are guarded too", async ({
    page,
  }) => {
    await useRole(page, "user")
    await page.goto("/dashboard/exams/some-exam-id/edit")

    await expect(page).toHaveURL(/\/dashboard\/forbidden$/)
  })

  test("signing out takes precedence: an unauthenticated visitor goes to login, not forbidden", async ({
    page,
  }) => {
    await useRole(page, "user")
    await signOut(page)
    await page.goto("/dashboard/users")

    await expect(page).toHaveURL(/\/login$/)
  })

  test("no dashboard content leaks in a forbidden response", async ({
    page,
  }) => {
    await useRole(page, "user")
    await page.goto("/dashboard/users")

    await expect(
      page.getByRole("heading", { name: "Manajemen Peserta" })
    ).toHaveCount(0)
    await expect(page.getByRole("table")).toHaveCount(0)
  })

  test("the forbidden page offers a way back to the dashboard", async ({
    page,
  }) => {
    await useRole(page, "user")
    await page.goto("/dashboard/users")

    await page.getByRole("link", { name: "Back to dashboard" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})
