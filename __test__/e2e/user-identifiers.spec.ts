import { expect, test } from "@playwright/test"
import { randomUUID } from "node:crypto"

import { signInAsRole } from "./fixtures/auth"
import { fillField, waitForHydration } from "./fixtures/interactions"

/**
 * The role-conditional identifier rules on the create-user form (ticket 05):
 * participants require a unique NISN (optional NIS), admins require NIP.
 */
test.describe("user identifiers", () => {
  const uniqueEmail = (label: string) =>
    `e2e-created-${label}-${randomUUID().slice(0, 8)}@example.com`

  async function openCreateForm(page: import("@playwright/test").Page) {
    await page.goto("/dashboard/users/create")
    await waitForHydration(page)
  }

  test("creating a participant without a NISN is rejected", async ({ page }) => {
    await signInAsRole(page, "super-admin")
    await openCreateForm(page)

    await fillField(page, "Nama Lengkap", "Peserta Tanpa NISN")
    await fillField(page, "Email", uniqueEmail("nonisn"))
    await fillField(page, "Kata Sandi", "Rahasia123!")
    await page.getByRole("button", { name: "Buat Pengguna" }).click()

    await expect(page.getByText("NISN harus berupa angka.")).toBeVisible()
  })

  test("a duplicate NISN is rejected before the account is created", async ({ page }) => {
    await signInAsRole(page, "super-admin")

    // Create the first participant with a known NISN.
    await openCreateForm(page)
    await fillField(page, "Nama Lengkap", "Peserta Pertama")
    await fillField(page, "Email", uniqueEmail("pertama"))
    await fillField(page, "Kata Sandi", "Rahasia123!")
    await fillField(page, "NISN", "1000000001")
    await page.getByRole("button", { name: "Buat Pengguna" }).click()
    await expect(page.getByText("Pengguna berhasil dibuat.")).toBeVisible()

    // A second participant with the same NISN is flagged as taken.
    await openCreateForm(page)
    await fillField(page, "Nama Lengkap", "Peserta Kedua")
    await fillField(page, "Email", uniqueEmail("kedua"))
    await fillField(page, "Kata Sandi", "Rahasia123!")
    await fillField(page, "NISN", "1000000001")
    await expect(page.getByText("NISN sudah digunakan.")).toBeVisible({ timeout: 10_000 })
  })

  test("creating an admin without a NIP is rejected", async ({ page }) => {
    await signInAsRole(page, "super-admin")
    await openCreateForm(page)

    await page.getByLabel("Role").click()
    await page.getByRole("option", { name: "Admin" }).click()

    await fillField(page, "Nama Lengkap", "Admin Tanpa NIP")
    await fillField(page, "Email", uniqueEmail("nonip"))
    await fillField(page, "Kata Sandi", "Rahasia123!")
    await page.getByRole("button", { name: "Buat Pengguna" }).click()

    await expect(page.getByText("NIP minimal 3 karakter.")).toBeVisible()
  })
})