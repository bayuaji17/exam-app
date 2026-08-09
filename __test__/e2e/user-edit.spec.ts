import { expect, test, type Page } from "@playwright/test"

import { getTestUser, signInAsRole } from "./fixtures/auth"
import {
  seedTargetUser,
  storedBanStateFor,
  storedRoleFor,
  userIdFor,
} from "./fixtures/created-users"
import {
  chooseOption,
  chooseRadio,
  fillField,
  submitAndNavigate,
} from "./fixtures/interactions"

function editUrl(userId: string) {
  return `/dashboard/users/${userId}/edit`
}

const ROLE_TRIGGER_LOCATOR = (page: Page) =>
  page.getByRole("combobox", { name: "Role" })

/**
 * Call an admin endpoint straight from the page, bypassing the form.
 *
 * The forms only offer what the actor is allowed to do, so the rules that stop
 * an escalation have to be proven against the API itself.
 */
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

test.describe("editing a user", () => {
  test("a super-admin promotes a regular user to admin", async ({ page }) => {
    const target = await seedTargetUser("promote", "user")

    await signInAsRole(page, "super-admin")
    await page.goto(editUrl(target.id))

    await chooseOption(page, ROLE_TRIGGER_LOCATOR(page), "Admin")
    await submitAndNavigate(page, "Simpan Role", /\/dashboard\/users$/)

    expect(await storedRoleFor(target.email)).toBe("admin")
  })

  test("a super-admin demotes an admin to regular user", async ({ page }) => {
    const target = await seedTargetUser("demote", "admin")

    await signInAsRole(page, "super-admin")
    await page.goto(editUrl(target.id))

    await chooseOption(page, ROLE_TRIGGER_LOCATOR(page), "User")
    await submitAndNavigate(page, "Simpan Role", /\/dashboard\/users$/)

    expect(await storedRoleFor(target.email)).toBe("user")
  })

  test("an admin is offered the ban form but not the role form", async ({
    page,
  }) => {
    const target = await seedTargetUser("admin-view", "user")

    await signInAsRole(page, "admin")
    await page.goto(editUrl(target.id))

    await expect(
      page.getByRole("heading", { name: "Status Blokir" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Ubah Role" })
    ).toHaveCount(0)
  })

  test("an admin bans a regular user permanently", async ({ page }) => {
    const target = await seedTargetUser("ban-permanent", "user")

    await signInAsRole(page, "admin")
    await page.goto(editUrl(target.id))

    await fillField(page, "Alasan Blokir", "Melanggar aturan ujian")
    await expect(page.getByTestId("ban-expiry-preview")).toHaveText(
      "Blokir tidak akan berakhir otomatis."
    )
    await submitAndNavigate(page, "Blokir Akun", /\/dashboard\/users$/)

    const state = await storedBanStateFor(target.email)

    expect(state?.banned).toBe(true)
    expect(state?.banReason).toBe("Melanggar aturan ujian")
    expect(state?.banExpires).toBeNull()
  })

  test("a temporary ban previews its expiry and stores one", async ({
    page,
  }) => {
    const target = await seedTargetUser("ban-temporary", "user")

    await signInAsRole(page, "admin")
    await page.goto(editUrl(target.id))

    await chooseRadio(page, "Sementara")
    await chooseOption(
      page,
      page.getByRole("combobox", { name: "Lama Blokir" }),
      "7 hari"
    )

    await expect(page.getByTestId("ban-expiry-preview")).toContainText(
      "Blokir berakhir:"
    )

    await submitAndNavigate(page, "Blokir Akun", /\/dashboard\/users$/)

    const state = await storedBanStateFor(target.email)

    expect(state?.banned).toBe(true)
    expect(state?.banExpires).not.toBeNull()
  })

  test("a banned user cannot sign in", async ({ page }) => {
    test.setTimeout(60_000)

    const target = await seedTargetUser("ban-signin", "user")

    await signInAsRole(page, "admin")
    await page.goto(editUrl(target.id))
    await submitAndNavigate(page, "Blokir Akun", /\/dashboard\/users$/)

    const banned = await page.evaluate(
      async ({ email, password }) => {
        const response = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })

        return response.status
      },
      { email: target.email, password: target.password }
    )

    expect(banned).toBeGreaterThanOrEqual(400)
    expect((await storedBanStateFor(target.email))?.banned).toBe(true)
  })

  test("unbanning lets a banned user sign in again", async ({ page }) => {
    test.setTimeout(60_000)

    const target = await seedTargetUser("unban-signin", "user")

    // Ban through the API so this test can focus on the unban form.
    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")
    const banStatus = await callAdminApi(page, "ban-user", {
      userId: target.id,
      banReason: "temporary suspension",
    })
    expect(banStatus).toBe(200)

    await page.goto(editUrl(target.id))
    await submitAndNavigate(page, "Buka Blokir", /\/dashboard\/users$/)

    const unbanned = await page.evaluate(
      async ({ email, password }) => {
        const response = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })

        return response.status
      },
      { email: target.email, password: target.password }
    )

    expect(unbanned).toBe(200)
    expect((await storedBanStateFor(target.email))?.banned).toBe(false)
  })

  test("the edit page refuses a super-admin target", async ({ page }) => {
    const superAdminId = await userIdFor(getTestUser("super-admin").email)

    await signInAsRole(page, "super-admin")
    await page.goto(editUrl(superAdminId))

    await expect(
      page.getByText("Anda tidak dapat mengubah akun Anda sendiri.")
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Simpan Role" })).toHaveCount(
      0
    )
  })

  test("the edit page refuses your own account", async ({ page }) => {
    const adminId = await userIdFor(getTestUser("admin").email)

    await signInAsRole(page, "admin")
    await page.goto(editUrl(adminId))

    await expect(
      page.getByText("Anda tidak dapat mengubah akun Anda sendiri.")
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Blokir Akun" })
    ).toHaveCount(0)
  })

  test("an admin cannot ban a super-admin, which would lock the platform out", async ({
    page,
  }) => {
    const superAdminEmail = getTestUser("super-admin").email
    const superAdminId = await userIdFor(superAdminEmail)

    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")

    const status = await callAdminApi(page, "ban-user", {
      userId: superAdminId,
      banReason: "escalation attempt",
    })

    expect(status).toBeGreaterThanOrEqual(400)
    expect((await storedBanStateFor(superAdminEmail))?.banned).toBe(false)
  })

  test("an admin cannot change anyone's role", async ({ page }) => {
    const target = await seedTargetUser("role-escalation", "user")

    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")

    const status = await callAdminApi(page, "set-role", {
      userId: target.id,
      role: "admin",
    })

    expect(status).toBeGreaterThanOrEqual(400)
    expect(await storedRoleFor(target.email)).toBe("user")
  })

  test("nobody can promote anyone to super-admin", async ({ page }) => {
    const target = await seedTargetUser("super-escalation", "user")

    await signInAsRole(page, "super-admin")
    await page.goto("/dashboard/users")

    const status = await callAdminApi(page, "set-role", {
      userId: target.id,
      role: "super-admin",
    })

    expect(status).toBeGreaterThanOrEqual(400)
    expect(await storedRoleFor(target.email)).toBe("user")
  })

  test("a super-admin cannot demote themselves", async ({ page }) => {
    const superAdminEmail = getTestUser("super-admin").email
    const superAdminId = await userIdFor(superAdminEmail)

    await signInAsRole(page, "super-admin")
    await page.goto("/dashboard/users")

    const status = await callAdminApi(page, "set-role", {
      userId: superAdminId,
      role: "user",
    })

    expect(status).toBeGreaterThanOrEqual(400)
    expect(await storedRoleFor(superAdminEmail)).toBe("super-admin")
  })

  test("a regular user cannot open the edit page", async ({ page }) => {
    const target = await seedTargetUser("forbidden", "user")

    await signInAsRole(page, "user")
    await page.goto(editUrl(target.id))

    await expect(page).toHaveURL(/\/dashboard\/forbidden$/)
  })
})
