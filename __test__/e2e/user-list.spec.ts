import { expect, test, type Page } from "@playwright/test"

import { getTestUser, signInAsRole } from "./fixtures/auth"

const COLUMN_HEADERS = ["Nama", "Email", "Role", "Bergabung", "Status", "Aksi"]

const DAY_SHORT_MONTH_YEAR = /^\d{2} [A-Z][a-z]{2} \d{4}$/

/**
 * Emails in render order, read from the email column.
 *
 * The suite asserts *relative* order rather than absolute row indexes: this
 * database can also hold a real super-admin from `auth:seed-super-admin`, and
 * later tickets will add more accounts. Relative order still pins the sort.
 */
async function emailsInRenderOrder(page: Page): Promise<string[]> {
  const emails = await page
    .locator("tbody tr td:nth-child(2)")
    .allInnerTexts()

  return emails.map((email) => email.trim())
}

function rowForEmail(page: Page, email: string) {
  return page.locator("tbody tr").filter({ hasText: email })
}

test.describe("user management list", () => {
  test("an admin sees the seeded accounts in a table", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")

    for (const header of COLUMN_HEADERS) {
      await expect(
        page.getByRole("columnheader", { name: header, exact: true })
      ).toBeVisible()
    }

    for (const role of ["user", "admin", "super-admin"] as const) {
      const seeded = getTestUser(role)

      await expect(rowForEmail(page, seeded.email)).toBeVisible()
    }
  })

  test("roles render as readable labels rather than raw slugs", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")

    await expect(
      rowForEmail(page, getTestUser("admin").email).getByText("Admin", {
        exact: true,
      })
    ).toBeVisible()

    await expect(
      rowForEmail(page, getTestUser("super-admin").email).getByText(
        "Super Admin",
        { exact: true }
      )
    ).toBeVisible()

    await expect(
      rowForEmail(page, getTestUser("user").email).getByText("User", {
        exact: true,
      })
    ).toBeVisible()

    // Scoped to whole-cell text: a real super-admin account can legitimately
    // carry "super-admin" inside its email, so a page-wide text search would
    // match that address rather than a mislabelled role.
    for (const slug of ["user", "admin", "super-admin"] as const) {
      await expect(
        page.getByRole("cell", { name: slug, exact: true })
      ).toHaveCount(0)
    }
  })

  test("accounts are ordered newest first", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")

    const emails = await emailsInRenderOrder(page)

    // Seeded in the order user, admin, super-admin, each in its own
    // transaction, so newest-first is the reverse of that.
    const superAdminAt = emails.indexOf(getTestUser("super-admin").email)
    const adminAt = emails.indexOf(getTestUser("admin").email)
    const userAt = emails.indexOf(getTestUser("user").email)

    expect(superAdminAt).toBeGreaterThanOrEqual(0)
    expect(superAdminAt).toBeLessThan(adminAt)
    expect(adminAt).toBeLessThan(userAt)
  })

  test("every row links to its own edit page", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")

    const row = rowForEmail(page, getTestUser("user").email)
    const editLink = row.getByRole("link", { name: "Edit" })

    await expect(editLink).toHaveAttribute(
      "href",
      /^\/dashboard\/users\/[^/]+\/edit$/
    )
  })

  test("the joined date renders in a stable format", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")

    const joined = await rowForEmail(page, getTestUser("user").email)
      .locator("td:nth-child(4)")
      .innerText()

    expect(joined.trim()).toMatch(DAY_SHORT_MONTH_YEAR)
  })

  test("an account that is not banned shows as active", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")

    await expect(
      rowForEmail(page, getTestUser("user").email).getByText("Aktif", {
        exact: true,
      })
    ).toBeVisible()
  })

  test("a super-admin can also read the list", async ({ page }) => {
    await signInAsRole(page, "super-admin")
    await page.goto("/dashboard/users")

    await expect(page).toHaveURL(/\/dashboard\/users$/)
    await expect(
      rowForEmail(page, getTestUser("admin").email)
    ).toBeVisible()
  })

  test("a regular user cannot read the list", async ({ page }) => {
    await signInAsRole(page, "user")
    await page.goto("/dashboard/users")

    await expect(page).toHaveURL(/\/dashboard\/forbidden$/)
    await expect(page.locator("tbody tr")).toHaveCount(0)
  })
})
