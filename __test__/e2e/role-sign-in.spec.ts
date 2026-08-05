import { expect, test } from "@playwright/test"

import { signInAs } from "./fixtures/auth"

const ROLES = ["user", "admin", "super-admin"] as const

for (const role of ROLES) {
  test(`a ${role} can sign in and reach the dashboard`, async ({ page }) => {
    const user = await signInAs(page, role)

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByText(user.name)).toBeVisible()
  })
}
