import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import {
  storedRoleFor,
  uniqueTestEmail,
  userExists,
} from "./fixtures/created-users"
import {
  chooseOption,
  clickAndVerify,
  fillField,
  submitAndNavigate,
} from "./fixtures/interactions"

const CREATE_URL = "/dashboard/users/create"

async function fillCreateForm(
  page: Page,
  values: { name: string; email: string; password: string }
) {
  await fillField(page, "Nama", values.name)
  await fillField(page, "Email", values.email)
  await fillField(page, "Kata Sandi", values.password)
}

/**
 * Open the role dropdown and return the option locator.
 *
 * The click is retried until the dropdown actually opens, so it cannot be
 * lost to pre-hydration interactions.
 */
async function openRoleOptions(page: Page) {
  const trigger = page.getByRole("combobox", { name: "Role" })
  const options = page.getByRole("option")

  await clickAndVerify(
    () => trigger.click(),
    () => expect(options.first()).toBeVisible()
  )

  return options
}

test.describe("creating a user", () => {
  test("an admin is offered the regular user role only", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(CREATE_URL)

    const options = await openRoleOptions(page)

    await expect(options).toHaveCount(1)
    await expect(options.first()).toHaveText("User")
  })

  test("a super-admin is offered both user and admin", async ({ page }) => {
    await signInAsRole(page, "super-admin")
    await page.goto(CREATE_URL)

    const options = await openRoleOptions(page)

    await expect(options).toHaveCount(2)
    await expect(options.nth(0)).toHaveText("User")
    await expect(options.nth(1)).toHaveText("Admin")
  })

  test("an address that is not an email is rejected before submitting", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await page.goto(CREATE_URL)

    await fillCreateForm(page, {
      name: "Budi Santoso",
      email: "budi@",
      password: "password123",
    })
    await clickAndVerify(
      () => page.getByRole("button", { name: "Simpan Pengguna" }).click(),
      () =>
        expect(page.getByText("Enter a valid email address")).toBeVisible()
    )
    await expect(page).toHaveURL(new RegExp(`${CREATE_URL}$`))
  })

  test("a password shorter than eight characters is rejected", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await page.goto(CREATE_URL)

    await fillCreateForm(page, {
      name: "Budi Santoso",
      email: uniqueTestEmail("shortpw"),
      password: "short12",
    })
    await clickAndVerify(
      () => page.getByRole("button", { name: "Simpan Pengguna" }).click(),
      () =>
        expect(
          page.getByText("Password must be at least 8 characters")
        ).toBeVisible()
    )
    await expect(page).toHaveURL(new RegExp(`${CREATE_URL}$`))
  })

  test("a missing name is rejected", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(CREATE_URL)

    await fillCreateForm(page, {
      name: "",
      email: uniqueTestEmail("noname"),
      password: "password123",
    })
    await clickAndVerify(
      () => page.getByRole("button", { name: "Simpan Pengguna" }).click(),
      () => expect(page.getByText("Name is required")).toBeVisible()
    )
  })

  test("an admin creates a user, lands back on the list, and sees the new row", async ({
    page,
  }) => {
    const email = uniqueTestEmail("by-admin")

    await signInAsRole(page, "admin")
    await page.goto(CREATE_URL)

    await fillCreateForm(page, {
      name: "Peserta Baru",
      email,
      password: "password123",
    })
    await submitAndNavigate(page, "Simpan Pengguna", /\/dashboard\/users$/)
    await expect(page.locator("tbody tr").filter({ hasText: email })).toBeVisible()

    expect(await storedRoleFor(email)).toBe("user")
  })

  test("a super-admin can create an admin", async ({ page }) => {
    const email = uniqueTestEmail("new-admin")

    await signInAsRole(page, "super-admin")
    await page.goto(CREATE_URL)

    await fillCreateForm(page, {
      name: "Admin Baru",
      email,
      password: "password123",
    })
    await chooseOption(
      page,
      page.getByRole("combobox", { name: "Role" }),
      "Admin"
    )
    // Admins require NIP (role-conditional identifier rule).
    await fillField(page, "NIP", "NIP-ADMIN-001")
    await submitAndNavigate(page, "Simpan Pengguna", /\/dashboard\/users$/)
    expect(await storedRoleFor(email)).toBe("admin")
  })

  test("a regular user cannot open the create page", async ({ page }) => {
    await signInAsRole(page, "user")
    await page.goto(CREATE_URL)

    await expect(page).toHaveURL(/\/dashboard\/forbidden$/)
    await expect(page.getByLabel("Nama")).toHaveCount(0)
  })

  test("an admin cannot create an admin by tampering with the request", async ({
    page,
  }) => {
    const email = uniqueTestEmail("tampered")

    await signInAsRole(page, "admin")
    await page.goto("/dashboard/users")

    // Bypasses the form entirely: the browser can send whatever it likes, so
    // the rule has to hold on the server.
    const status = await page.evaluate(async (targetEmail) => {
      const response = await fetch("/api/auth/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Penyusup",
          email: targetEmail,
          password: "password123",
          role: "admin",
        }),
      })

      return response.status
    }, email)

    expect(status).toBeGreaterThanOrEqual(400)
    expect(await userExists(email)).toBe(false)
  })

  test("nobody can create a super-admin by tampering with the request", async ({
    page,
  }) => {
    const email = uniqueTestEmail("tampered-super")

    await signInAsRole(page, "super-admin")
    await page.goto("/dashboard/users")

    const status = await page.evaluate(async (targetEmail) => {
      const response = await fetch("/api/auth/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Super Penyusup",
          email: targetEmail,
          password: "password123",
          role: "super-admin",
        }),
      })

      return response.status
    }, email)

    expect(status).toBeGreaterThanOrEqual(400)
    expect(await userExists(email)).toBe(false)
  })
})
