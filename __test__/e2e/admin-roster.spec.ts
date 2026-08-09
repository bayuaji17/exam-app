import { expect, test, type Page } from "@playwright/test"

import { getTestUser, signInAsRole } from "./fixtures/auth"
import {
  seedTargetUser,
  storedRoleFor,
} from "./fixtures/created-users"
import {
  chooseOption,
  clickAndVerify,
  waitForHydration,
} from "./fixtures/interactions"

const ROSTER_URL = "/dashboard/admins"

function rowForEmail(page: Page, email: string) {
  return page.locator("tbody tr").filter({ hasText: email })
}

async function callAdminApi(
  page: Page,
  path: string,
  body: Record<string, unknown>
): Promise<number> {
  return page.evaluate(
    async ({ path, body }) => {
      const response = await fetch(`/api/auth/admin/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      return response.status
    },
    { path, body }
  )
}

test.describe("admin roster management", () => {
  test("a super-admin sees every admin and super-admin account", async ({
    page,
  }) => {
    const target = await seedTargetUser("roster-view", "admin")

    await signInAsRole(page, "super-admin")
    await page.goto(ROSTER_URL)
    await waitForHydration(page)

    for (const email of [
      getTestUser("admin").email,
      getTestUser("super-admin").email,
      target.email,
    ]) {
      await expect(rowForEmail(page, email)).toBeVisible()
    }
  })

  test("super-admin rows cannot be demoted; admin rows can", async ({
    page,
  }) => {
    await seedTargetUser("roster-actions", "admin")

    await signInAsRole(page, "super-admin")
    await page.goto(ROSTER_URL)
    await waitForHydration(page)

    const superAdminRow = rowForEmail(page, getTestUser("super-admin").email)

    await expect(superAdminRow.getByText("Tidak dapat diturunkan")).toBeVisible()
    await expect(
      superAdminRow.getByRole("button", { name: "Turunkan ke User" })
    ).toHaveCount(0)

    const adminRow = rowForEmail(page, getTestUser("admin").email)

    await expect(
      adminRow.getByRole("button", { name: "Turunkan ke User" })
    ).toBeVisible()
  })

  test("a super-admin demotes an admin after confirming the dialog", async ({
    page,
  }) => {
    const target = await seedTargetUser("demote-roster", "admin")

    await signInAsRole(page, "super-admin")
    await page.goto(ROSTER_URL)
    await waitForHydration(page)

    const row = rowForEmail(page, target.email)

    await clickAndVerify(
      async () => {
        await row
          .getByRole("button", { name: "Turunkan ke User" })
          .click()
      },
      async () => {
        await expect(
          page.getByRole("heading", { name: `Turunkan Target demote-roster?` })
        ).toBeVisible()
      }
    )

    await page.getByRole("button", { name: "Turunkan", exact: true }).click()

    await expect(row).toHaveCount(0)
    expect(await storedRoleFor(target.email)).toBe("user")
  })

  test("a super-admin promotes a regular user to admin", async ({ page }) => {
    const target = await seedTargetUser("promote-roster", "user")

    await signInAsRole(page, "super-admin")
    await page.goto(ROSTER_URL)
    await waitForHydration(page)

    await clickAndVerify(
      async () => {
        await page.getByRole("button", { name: "Promosikan Pengguna" }).click()
      },
      async () => {
        await expect(
          page.getByRole("heading", { name: "Promosikan ke Admin" })
        ).toBeVisible()
      }
    )

    const trigger = page.getByRole("combobox", { name: "Pilih pengguna" })

    await chooseOption(page, trigger, target.email)

    await page.getByRole("button", { name: "Promosikan", exact: true }).click()

    await expect(rowForEmail(page, target.email)).toBeVisible()
    expect(await storedRoleFor(target.email)).toBe("admin")
  })

  test("no super admin can be demoted by another super admin", async ({
    page,
  }) => {
    const other = await seedTargetUser("other-super", "super-admin")

    await signInAsRole(page, "super-admin")
    await page.goto(ROSTER_URL)
    await waitForHydration(page)

    const status = await callAdminApi(page, "set-role", {
      userId: other.id,
      role: "user",
    })

    expect(status).toBeGreaterThanOrEqual(400)
    expect(await storedRoleFor(other.email)).toBe("super-admin")
  })

  test("an admin is sent to the forbidden page", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(ROSTER_URL)

    await expect(page).toHaveURL(/\/dashboard\/forbidden$/)
  })

  test("a regular user is sent to the forbidden page", async ({ page }) => {
    await signInAsRole(page, "user")
    await page.goto(ROSTER_URL)

    await expect(page).toHaveURL(/\/dashboard\/forbidden$/)
  })
})
