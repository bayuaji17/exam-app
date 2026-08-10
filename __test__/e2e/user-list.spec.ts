import { expect, test, type Page } from "@playwright/test"

import { getTestUser, signInAsRole } from "./fixtures/auth"
import {
  seedManyUsers,
  seedTargetUser,
  setUserBanState,
} from "./fixtures/created-users"
import { chooseOption, fillField } from "./fixtures/interactions"

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
    await page.goto("/dashboard/users?q=test-&size=25")

    for (const header of COLUMN_HEADERS) {
      await expect(
        page.getByRole("columnheader", { name: header })
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
    await page.goto("/dashboard/users?q=test-&size=25")

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
    await seedManyUsers("table-order", 3)

    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users?q=table-order&sort=createdAt&order=asc")

    const ascending = await emailsInRenderOrder(page)

    await page.goto("/dashboard/users?q=table-order&sort=createdAt&order=desc")
    const descending = await emailsInRenderOrder(page)

    expect(descending).toEqual([...ascending].reverse())
  })

  test("every row links to its own edit page", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(`/dashboard/users?q=${getTestUser("user").email}`)

    const row = rowForEmail(page, getTestUser("user").email)
    const editLink = row.getByRole("link", { name: "Edit" })

    await expect(editLink).toHaveAttribute(
      "href",
      /^\/dashboard\/users\/[^/]+\/edit$/
    )
  })

  test("the joined date renders in a stable format", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(`/dashboard/users?q=${getTestUser("user").email}`)

    const joined = await rowForEmail(page, getTestUser("user").email)
      .locator("td:nth-child(4)")
      .innerText()

    expect(joined.trim()).toMatch(DAY_SHORT_MONTH_YEAR)
  })

  test("an account that is not banned shows as active", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(`/dashboard/users?q=${getTestUser("user").email}`)

    await expect(
      rowForEmail(page, getTestUser("user").email).getByText("Aktif", {
        exact: true,
      })
    ).toBeVisible()
  })

  test("a super-admin can also read the list", async ({ page }) => {
    await signInAsRole(page, "super-admin")
    await page.goto(`/dashboard/users?q=${getTestUser("admin").email}`)

    await expect(page).toHaveURL(/\/dashboard\/users\?q=/)
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

  test("search narrows the list by name or email and updates the URL", async ({
    page,
  }) => {
    const target = await seedTargetUser("table-search", "user")

    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")
    await fillField(page, "Cari pengguna", "table-search")

    await expect(page).toHaveURL(/q=table-search/)
    await expect(rowForEmail(page, target.email)).toBeVisible()
    await expect(page.locator("tbody tr")).toHaveCount(1)
  })

  test("role and ban-status filters narrow the rows", async ({ page }) => {
    const banned = await seedTargetUser("table-banned", "user")
    await setUserBanState(banned.email, true)

    await signInAsRole(page, "admin")
    await page.goto(`/dashboard/users?q=${banned.email}`)

    await chooseOption(
      page,
      page.getByRole("combobox", { name: "Filter role" }),
      "User"
    )
    await expect(page).toHaveURL(/role=user/)

    await chooseOption(
      page,
      page.getByRole("combobox", { name: "Filter status" }),
      "Diblokir"
    )
    await expect(page).toHaveURL(/status=banned/)
    await expect(rowForEmail(page, banned.email)).toBeVisible()
    await expect(page.locator("tbody tr")).toHaveCount(1)
  })

  test("name sorting toggles ascending and descending", async ({ page }) => {
    await seedManyUsers("table-sort", 3)

    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users?q=table-sort")

    const sortLink = page.getByRole("link", { name: "Urutkan berdasarkan Nama" })

    await sortLink.click()
    await expect(page).toHaveURL(/sort=name&order=asc/)
    const ascending = await page.locator("tbody tr td:first-child").allInnerTexts()
    expect(ascending).toEqual([...ascending].sort((a, b) => a.localeCompare(b)))

    await sortLink.click()
    await expect(page).toHaveURL(/sort=name&order=desc/)
    const descending = await page.locator("tbody tr td:first-child").allInnerTexts()
    expect(descending).toEqual(
      [...descending].sort((a, b) => b.localeCompare(a))
    )
  })

  test("pagination shows the next page and preserves the search", async ({
    page,
  }) => {
    await seedManyUsers("table-page", 11)

    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users?q=table-page&size=10")

    await expect(page.locator("tbody tr")).toHaveCount(10)
    await page.getByRole("link", { name: "Berikutnya" }).click()

    await expect(page).toHaveURL(/q=table-page.*page=2/)
    await expect(page.locator("tbody tr")).toHaveCount(1)
  })
})
