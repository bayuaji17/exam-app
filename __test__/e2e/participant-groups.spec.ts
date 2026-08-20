import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import {
  groupExists,
  seedParticipantGroup,
  SEEDED_GROUP_PREFIX,
} from "./fixtures/seeded-groups"
import { fillField, submitAndNavigate, waitForHydration } from "./fixtures/interactions"

const GROUPS_URL = "/dashboard/user-groups"

/** A per-run-unique name, so leftovers from a crashed run cannot collide. */
function uniqueName(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`
}

test.describe("participant group CRUD", () => {
  test("an admin creates a group and sees it with its member count", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    await page.goto(`${GROUPS_URL}/new`)

    await fillField(page, "Nama Grup", `${SEEDED_GROUP_PREFIX} Matematika`)
    await fillField(page, "Deskripsi", "Kelompok peserta ujian matematika")
    await submitAndNavigate(page, "Buat Grup Peserta", /\/dashboard\/user-groups$/)

    await page.getByLabel("Cari grup peserta").fill("Matematika")
    const createdRow = page.getByRole("row", { name: /Group Matematika/ })
    await expect(createdRow).toBeVisible({ timeout: 20_000 })
    await expect(createdRow.getByText("0", { exact: true })).toBeVisible()
  })

  test("validation errors block an empty form", async ({ page }) => {
    await signInAsRole(page, "admin")
    await page.goto(`${GROUPS_URL}/new`)
    await waitForHydration(page)

    await page.getByRole("button", { name: "Buat Grup Peserta" }).click()
    await expect(page.getByText("Nama grup wajib diisi.")).toBeVisible()
  })

  test("duplicate names are rejected", async ({ page }) => {
    await signInAsRole(page, "admin")
    const name = uniqueName(`${SEEDED_GROUP_PREFIX} Duplikat`)
    await seedParticipantGroup(name)
    await page.goto(`${GROUPS_URL}/new`)
    await waitForHydration(page)

    await fillField(page, "Nama Grup", name)
    await page.getByRole("button", { name: "Buat Grup Peserta" }).click()

    await expect(page.getByText("Grup dengan nama tersebut sudah ada.").first()).toBeVisible()
  })

  test("an admin edits a group", async ({ page }) => {
    await signInAsRole(page, "admin")
    const groupId = await seedParticipantGroup(
      uniqueName(`${SEEDED_GROUP_PREFIX} Untuk Diedit`)
    )

    await page.goto(`${GROUPS_URL}/${groupId}/edit`)
    await fillField(page, "Nama Grup", `${SEEDED_GROUP_PREFIX} Setelah Diedit`)
    await submitAndNavigate(page, "Simpan Perubahan", /\/dashboard\/user-groups$/)

    await page.getByLabel("Cari grup peserta").fill("Setelah Diedit")
    await expect(
      page.getByRole("row", { name: /Setelah Diedit/ })
    ).toBeVisible({ timeout: 20_000 })
  })

  test("an admin deletes a group through confirmation", async ({ page }) => {
    await signInAsRole(page, "admin")
    const name = uniqueName(`${SEEDED_GROUP_PREFIX} Dihapus`)
    const groupId = await seedParticipantGroup(name)

    await page.goto(GROUPS_URL)
    await page.getByLabel("Cari grup peserta").fill(name)

    const row = page.getByRole("row", { name: new RegExp(name) })
    await expect(row).toBeVisible({ timeout: 20_000 })
    await row.getByRole("button", { name: "Hapus" }).click()

    await expect(page.getByText("Hapus grup peserta?")).toBeVisible()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()
    await expect(row).toBeHidden({ timeout: 20_000 })

    // The server action runs after the click; poll the DB until the group is
    // actually gone before asserting the 404.
    await expect
      .poll(async () => groupExists(groupId), { timeout: 20_000 })
      .toBe(false)

    await page.goto(`${GROUPS_URL}/${groupId}`)
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible()
  })

  test("a participant is blocked from groups", async ({ page }) => {
    await signInAsRole(page, "user")
    await page.goto(GROUPS_URL)

    await expect(page.getByText("Access denied")).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard\/forbidden/)
  })
})
