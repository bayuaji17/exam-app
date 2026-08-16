import { randomUUID } from "node:crypto"
import { expect, test } from "@playwright/test"
import nextEnv from "@next/env"
import pg from "pg"

import { signInAsRole } from "./fixtures/auth"
import { seedTargetUser, setUserBanState } from "./fixtures/created-users"
import {
  grantGroupEligibility,
  grantUserEligibility,
  userEligibilityExists,
} from "./fixtures/seeded-eligibility"
import {
  addGroupMember,
  seedParticipantGroup,
  SEEDED_GROUP_PREFIX,
} from "./fixtures/seeded-groups"
import { seedExamPackage, SEEDED_PACKAGE_PREFIX } from "./fixtures/seeded-packages"
import { seedExamSchedule, SEEDED_SCHEDULE_PREFIX } from "./fixtures/seeded-schedules"
import { waitForHydration } from "./fixtures/interactions"

const { loadEnvConfig } = nextEnv

/** A per-run-unique name, so leftovers from a crashed run cannot collide. */
function uniqueName(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`
}

function futureWindow(): { startsAt: Date; endsAt: Date } {
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return { startsAt: start, endsAt: new Date(start.getTime() + 2 * 60 * 60 * 1000) }
}

async function seedSchedule(): Promise<string> {
  const packageId = await seedExamPackage(
    uniqueName(`${SEEDED_PACKAGE_PREFIX} Akses`)
  )
  const { startsAt, endsAt } = futureWindow()

  return seedExamSchedule({
    name: uniqueName(`${SEEDED_SCHEDULE_PREFIX} Akses`),
    packageId,
    startsAt,
    endsAt,
  })
}

async function grantUserThroughUi(
  page: import("@playwright/test").Page,
  name: string
) {
  await page.getByRole("button", { name: "Tambah akses peserta…" }).click()
  await page.getByLabel("Cari peserta untuk akses").fill(name)
  await page.getByRole("option", { name: new RegExp(name) }).click()
}

async function groupEligibilityCount(scheduleId: string): Promise<number> {
  loadEnvConfig(process.cwd())
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const url = process.env.DATABASE_URL

  if (!url) {
    throw new Error("DATABASE_URL is not set.")
  }

  try {
    const result = await pool.query<{ count: string }>(
      `select count(*)::text as "count" from "schedule_group_eligibility" where "scheduleId" = $1`,
      [scheduleId]
    )

    return Number(result.rows[0]?.count ?? 0)
  } finally {
    await pool.end()
  }
}

test.describe("schedule eligibility", () => {
  test("an admin grants a participant directly and sees it in the eligible list", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const scheduleId = await seedSchedule()
    const target = await seedTargetUser("akses-langsung", "user")

    await page.goto(`/dashboard/exam-schedules/${scheduleId}/eligibility`)
    await waitForHydration(page)
    await grantUserThroughUi(page, target.name)

    const grantedRow = page.getByText(target.name, { exact: true })
    await expect(grantedRow.first()).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByRole("row", { name: new RegExp(target.name) })
    ).toBeVisible({ timeout: 20_000 })
    expect(await userEligibilityExists(scheduleId, target.id)).toBe(true)
  })

  test("granting a group makes its members eligible (union)", async ({ page }) => {
    await signInAsRole(page, "admin")
    const scheduleId = await seedSchedule()
    const groupId = await seedParticipantGroup(
      uniqueName(`${SEEDED_GROUP_PREFIX} Akses`)
    )
    const member = await seedTargetUser("anggota-akses", "user")
    await addGroupMember(groupId, member.email)

    await page.goto(`/dashboard/exam-schedules/${scheduleId}/eligibility`)
    await waitForHydration(page)
    await page.getByRole("button", { name: "Tambah akses grup…" }).click()
    await page.getByLabel("Cari grup untuk akses").fill(SEEDED_GROUP_PREFIX)
    await page
      .getByRole("option", { name: new RegExp(`${SEEDED_GROUP_PREFIX} Akses`) })
      .click()

    await expect(page.getByText("1 anggota").first()).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByRole("row", { name: new RegExp(member.name) })
    ).toBeVisible({ timeout: 20_000 })
  })

  test("revoking a grant removes the participant from the eligible list", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const scheduleId = await seedSchedule()
    const target = await seedTargetUser("dicabut", "user")
    await grantUserEligibility(scheduleId, target.id)

    await page.goto(`/dashboard/exam-schedules/${scheduleId}/eligibility`)

    const grantedRow = page.getByText(target.name, { exact: true }).first()
    await expect(grantedRow).toBeVisible({ timeout: 20_000 })
    await page
      .locator("li")
      .filter({ hasText: target.name })
      .getByRole("button", { name: "Cabut" })
      .click()

    // The server action runs after the click; poll the DB until the grant is
    // actually gone instead of relying on UI timing.
    await expect
      .poll(async () => userEligibilityExists(scheduleId, target.id), {
        timeout: 20_000,
      })
      .toBe(false)
    await expect(grantedRow).toBeHidden()
    await expect(
      page.getByRole("row", { name: new RegExp(target.name) })
    ).toBeHidden()
  })

  test("banned accounts are not offered when granting", async ({ page }) => {
    await signInAsRole(page, "admin")
    const scheduleId = await seedSchedule()
    const target = await seedTargetUser("akses-banned", "user")
    await setUserBanState(target.email, true)

    await page.goto(`/dashboard/exam-schedules/${scheduleId}/eligibility`)
    await waitForHydration(page)
    await page.getByRole("button", { name: "Tambah akses peserta…" }).click()
    await page.getByLabel("Cari peserta untuk akses").fill(target.name)

    await expect(
      page.getByRole("option", { name: new RegExp(target.name) })
    ).toHaveCount(0)
  })

  test("a granted group cannot be deleted", async ({ page }) => {
    await signInAsRole(page, "admin")
    const scheduleId = await seedSchedule()
    const groupId = await seedParticipantGroup(
      uniqueName(`${SEEDED_GROUP_PREFIX} Terkunci`)
    )
    await grantGroupEligibility(scheduleId, groupId)

    await page.goto("/dashboard/user-groups")
    await page
      .getByLabel("Cari grup peserta")
      .fill(SEEDED_GROUP_PREFIX)

    const row = page.getByRole("row", { name: /Terkunci/ })
    await expect(row).toBeVisible({ timeout: 20_000 })
    await row.getByRole("button", { name: "Hapus" }).click()
    await page.getByRole("button", { name: "Hapus", exact: true }).last().click()

    await expect(
      page.getByText("Grup sedang digunakan oleh aturan akses dan tidak dapat dihapus.")
    ).toBeVisible()
    expect(await groupEligibilityCount(scheduleId)).toBe(1)
  })

  test("deleting a schedule cascades its grants", async () => {
    const scheduleId = await seedSchedule()
    const target = await seedTargetUser("kaskade", "user")
    const groupId = await seedParticipantGroup(
      uniqueName(`${SEEDED_GROUP_PREFIX} Kaskade`)
    )
    await grantUserEligibility(scheduleId, target.id)
    await grantGroupEligibility(scheduleId, groupId)

    loadEnvConfig(process.cwd())
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

    try {
      await pool.query('delete from "exam_schedule" where "id" = $1', [
        scheduleId,
      ])
    } finally {
      await pool.end()
    }

    expect(await userEligibilityExists(scheduleId, target.id)).toBe(false)
    expect(await groupEligibilityCount(scheduleId)).toBe(0)
  })

  test("the access-rules hub lists schedules with their grant counts", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    // A unique name: parallel tests seed their own schedules, so matching a
    // shared label would be ambiguous.
    const packageId = await seedExamPackage(
      uniqueName(`${SEEDED_PACKAGE_PREFIX} Hub`)
    )
    const { startsAt, endsAt } = futureWindow()
    const scheduleId = await seedExamSchedule({
      name: uniqueName(`${SEEDED_SCHEDULE_PREFIX} Hub`),
      packageId,
      startsAt,
      endsAt,
    })
    const target = await seedTargetUser("hub", "user")
    await grantUserEligibility(scheduleId, target.id)

    await page.goto("/dashboard/exam-access-rules")

    const row = page.getByRole("row", { name: /Schedule Hub/ })
    await expect(row).toBeVisible({ timeout: 20_000 })
    await expect(row.getByText("1", { exact: true })).toBeVisible()
    await row.getByRole("link", { name: "Kelola" }).click()
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/exam-schedules/${scheduleId}/eligibility`)
    )
  })

  test("a participant is blocked from eligibility pages", async ({ page }) => {
    await signInAsRole(page, "user")
    const scheduleId = await seedSchedule()

    await page.goto(`/dashboard/exam-schedules/${scheduleId}/eligibility`)

    await expect(page.getByText("Access denied")).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard\/forbidden/)
  })
})
