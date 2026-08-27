import { randomUUID } from "node:crypto"
import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import {
  seedExamPackage,
  SEEDED_PACKAGE_PREFIX,
} from "./fixtures/seeded-packages"
import {
  seedExamSchedule,
  SEEDED_SCHEDULE_PREFIX,
} from "./fixtures/seeded-schedules"
import {
  chooseOption,
  fillField,
  submitAndNavigate,
  waitForHydration,
} from "./fixtures/interactions"

const SCHEDULES_URL = "/dashboard/exam-schedules"

/** A per-run-unique name, so leftovers from a crashed run cannot collide. */
function uniqueName(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`
}

/**
 * The suite runs with `fullyParallel`: every name below is unique per test,
 * and cleanup happens in the global teardown.
 */

function futureWindow(daysFromNow: number): {
  startsAt: string
  endsAt: string
} {
  const start = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const pad = (value: number) => String(value).padStart(2, "0")

  return {
    startsAt: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endsAt: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
  }
}

async function pickPackage(page: Page, name: string): Promise<void> {
  await page.getByLabel("Pilih paket ujian").click()
  await page.getByRole("option", { name: new RegExp(name) }).click()
}

test.describe("exam schedule CRUD", () => {
  test("an admin creates a schedule and sees it with its derived status", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const packageName = uniqueName(`${SEEDED_PACKAGE_PREFIX} Jadwal Sumber`)
    await seedExamPackage(packageName)
    await page.goto(`${SCHEDULES_URL}/new`)

    const { startsAt, endsAt } = futureWindow(7)
    await fillField(page, "Nama Jadwal", `${SEEDED_SCHEDULE_PREFIX} Matematika`)
    await pickPackage(page, packageName)
    await fillField(page, "Mulai", startsAt)
    await fillField(page, "Selesai", endsAt)
    await fillField(
      page,
      "Durasi (menit, opsional — mengikuti paket jika kosong)",
      "90"
    )
    await submitAndNavigate(page, "Buat Jadwal", /\/dashboard\/exam-schedules$/)

    await page.getByLabel("Cari jadwal").fill("Matematika")
    const createdRow = page.getByRole("row", { name: /Schedule Matematika/ })
    await expect(createdRow).toBeVisible({ timeout: 20_000 })
    await expect(createdRow.getByText("Akan Datang")).toBeVisible()
    await expect(createdRow.getByText("90 menit")).toBeVisible()
  })

  test("validation errors block invalid windows", async ({ page }) => {
    await signInAsRole(page, "admin")
    await seedExamPackage(uniqueName(`${SEEDED_PACKAGE_PREFIX} Jadwal Invalid`))
    await page.goto(`${SCHEDULES_URL}/new`)
    await waitForHydration(page)

    await page.getByRole("button", { name: "Buat Jadwal" }).click()
    await expect(page.getByText("Nama jadwal wajib diisi.")).toBeVisible()

    const { startsAt } = futureWindow(7)
    await fillField(page, "Nama Jadwal", `${SEEDED_SCHEDULE_PREFIX} Invalid`)
    await pickPackage(page, "Jadwal Invalid")
    await fillField(page, "Mulai", startsAt)
    await fillField(page, "Selesai", startsAt)
    await page.getByRole("button", { name: "Buat Jadwal" }).click()

    await expect(
      page.getByText("Waktu selesai harus setelah waktu mulai.")
    ).toBeVisible()
  })

  test("an admin edits a schedule", async ({ page }) => {
    await signInAsRole(page, "admin")
    const packageId = await seedExamPackage(
      uniqueName(`${SEEDED_PACKAGE_PREFIX} Jadwal Edit`)
    )
    const { startsAt, endsAt } = futureWindow(14)
    const scheduleId = await seedExamSchedule({
      name: `${SEEDED_SCHEDULE_PREFIX} Untuk Diedit`,
      packageId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    })

    await page.goto(`${SCHEDULES_URL}/${scheduleId}/edit`)

    await fillField(
      page,
      "Nama Jadwal",
      `${SEEDED_SCHEDULE_PREFIX} Setelah Diedit`
    )
    await submitAndNavigate(
      page,
      "Simpan Perubahan",
      /\/dashboard\/exam-schedules$/
    )

    await page.getByLabel("Cari jadwal").fill("Setelah Diedit")
    await expect(
      page.getByRole("row", { name: /Setelah Diedit/ })
    ).toBeVisible()
  })

  test("the status filter narrows by derived state", async ({ page }) => {
    await signInAsRole(page, "admin")
    const packageId = await seedExamPackage(
      uniqueName(`${SEEDED_PACKAGE_PREFIX} Jadwal Status`)
    )
    await seedExamSchedule({
      name: `${SEEDED_SCHEDULE_PREFIX} Mendatang`,
      packageId,
      startsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endsAt: new Date(
        Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ),
    })
    await seedExamSchedule({
      name: `${SEEDED_SCHEDULE_PREFIX} Selesai`,
      packageId,
      startsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endsAt: new Date(
        Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ),
    })

    await page.goto(SCHEDULES_URL)
    await chooseOption(
      page,
      page.getByLabel("Filter status jadwal"),
      "Selesai",
      true
    )

    const endedRow = page.getByRole("row", { name: /Schedule Selesai/ })
    await expect(endedRow).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByRole("row", { name: /Schedule Mendatang/ })
    ).toBeHidden()
  })

  test("a participant is blocked from schedules", async ({ page }) => {
    await signInAsRole(page, "user")
    await page.goto(SCHEDULES_URL)

    await expect(page.getByText("Access denied")).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard\/forbidden/)
  })
})
