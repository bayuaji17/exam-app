import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import { seedTargetUser, setUserBanState } from "./fixtures/created-users"
import {
  addGroupMember,
  groupMemberIds,
  seedParticipantGroup,
  SEEDED_GROUP_PREFIX,
} from "./fixtures/seeded-groups"
import { waitForHydration } from "./fixtures/interactions"

const GROUPS_URL = "/dashboard/user-groups"

/** A per-run-unique name, so leftovers from a crashed run cannot collide. */
function uniqueName(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`
}

async function addMemberThroughUi(
  page: import("@playwright/test").Page,
  name: string
) {
  await page.getByRole("button", { name: "Tambah peserta…" }).click()
  await page.getByLabel("Cari peserta").fill(name)
  await page.getByRole("option", { name: new RegExp(name) }).click()
}

test.describe("participant group membership", () => {
  test("an admin adds a participant and sees it in the member list", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const groupId = await seedParticipantGroup(
      uniqueName(`${SEEDED_GROUP_PREFIX} Anggota`)
    )
    const target = await seedTargetUser("anggota-1", "user")

    await page.goto(`${GROUPS_URL}/${groupId}`)
    await waitForHydration(page)
    await addMemberThroughUi(page, target.name)

    await expect(
      page.getByRole("row", { name: new RegExp(target.name) })
    ).toBeVisible({ timeout: 20_000 })

    const members = await groupMemberIds(groupId)
    expect(members).toContain(target.id)
  })

  test("banned accounts are never offered as candidates", async ({ page }) => {
    await signInAsRole(page, "admin")
    const groupId = await seedParticipantGroup(
      uniqueName(`${SEEDED_GROUP_PREFIX} Ban`)
    )
    const target = await seedTargetUser("dibanned", "user")
    await setUserBanState(target.email, true)

    await page.goto(`${GROUPS_URL}/${groupId}`)
    await waitForHydration(page)
    await page.getByRole("button", { name: "Tambah peserta…" }).click()

    // The search matches nothing: the banned account is not in the list, and
    // neither are any other accounts under that name.
    await page.getByLabel("Cari peserta").fill(target.name)
    await expect(
      page.getByRole("option", { name: new RegExp(target.name) })
    ).toHaveCount(0)
    await expect(page.getByText("Tidak ada peserta yang cocok.")).toBeVisible()
  })

  test("an admin removes a member", async ({ page }) => {
    await signInAsRole(page, "admin")
    const groupId = await seedParticipantGroup(
      uniqueName(`${SEEDED_GROUP_PREFIX} Hapus Anggota`)
    )
    const target = await seedTargetUser("hapus-anggota", "user")
    await addGroupMember(groupId, target.email)

    await page.goto(`${GROUPS_URL}/${groupId}`)

    const row = page.getByRole("row", { name: new RegExp(target.name) })
    await expect(row).toBeVisible({ timeout: 20_000 })
    await row.getByRole("button", { name: "Keluarkan" }).click()

    await expect(page.getByText(/Hapus .* dari grup\?/)).toBeVisible()
    await page
      .getByRole("button", { name: "Hapus", exact: true })
      .last()
      .click()

    // The server action runs after the click; poll the DB until the
    // membership is actually gone instead of relying on UI timing.
    await expect
      .poll(async () => (await groupMemberIds(groupId)).includes(target.id), {
        timeout: 20_000,
      })
      .toBe(false)
    await expect(row).toBeHidden({ timeout: 20_000 })
  })

  test("the member list shows every member added directly", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const groupId = await seedParticipantGroup(
      uniqueName(`${SEEDED_GROUP_PREFIX} Banyak Anggota`)
    )
    const first = await seedTargetUser("banyak-1", "user")
    const second = await seedTargetUser("banyak-2", "user")
    await addGroupMember(groupId, first.email)
    await addGroupMember(groupId, second.email)

    await page.goto(`${GROUPS_URL}/${groupId}`)

    await expect(page.getByText("2 anggota")).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByRole("row", { name: new RegExp(first.name) })
    ).toBeVisible()
    await expect(
      page.getByRole("row", { name: new RegExp(second.name) })
    ).toBeVisible()
  })
})
