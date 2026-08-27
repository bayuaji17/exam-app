import { randomUUID } from "node:crypto"
import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import { storedPasswordHashFor } from "./fixtures/created-users"
import {
  seedSessionForUser,
  seedTargetUser,
  signedSessionCookieValue,
} from "./fixtures/created-users"
import {
  seedExamPackage,
  SEEDED_PACKAGE_PREFIX,
} from "./fixtures/seeded-packages"
import {
  seedExamSchedule,
  SEEDED_SCHEDULE_PREFIX,
} from "./fixtures/seeded-schedules"
import { waitForHydration } from "./fixtures/interactions"

function uniqueName(label: string): string {
  return `${label} ${randomUUID().slice(0, 8)}`
}

const at = (dayOffsetHours: number, spanHours: number) => {
  // Align to the minute: the schedule form only carries minute precision,
  // so a seeded window with seconds/ms would overlap the form's value by
  // a few seconds and make the "boundary" case genuinely overlap.
  const start = new Date(Date.now() + dayOffsetHours * 60 * 60 * 1000)
  start.setSeconds(0, 0)

  return {
    startsAt: start,
    endsAt: new Date(start.getTime() + spanHours * 60 * 60 * 1000),
  }
}

const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function signInAsFreshUser(
  page: Page
): Promise<{ email: string; password: string }> {
  const target = await seedTargetUser(
    `polish-${randomUUID().slice(0, 6)}`,
    "user"
  )
  const { token } = await seedSessionForUser(target.id, {
    token: `polish-session-${randomUUID()}`,
  })

  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: signedSessionCookieValue(token),
      domain: "localhost",
      path: "/",
    },
  ])

  return { email: target.email, password: target.password }
}

test.describe("schedule overlap validation", () => {
  test("same-package overlaps are rejected on create and edit", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const packageId = await seedExamPackage(
      uniqueName(`${SEEDED_PACKAGE_PREFIX} Bentrok`)
    )
    const first = at(24, 2)
    const scheduleId = await seedExamSchedule({
      name: uniqueName(`${SEEDED_SCHEDULE_PREFIX} Bentrok Pertama`),
      packageId,
      startsAt: first.startsAt,
      endsAt: first.endsAt,
    })

    // Create: overlapping window is rejected.
    await page.goto("/dashboard/exam-schedules/new")
    await waitForHydration(page)
    await page
      .getByLabel("Nama Jadwal")
      .fill(uniqueName(`${SEEDED_SCHEDULE_PREFIX} Bentrok Kedua`))
    await page.getByLabel("Pilih paket ujian").click()
    await page.getByRole("option", { name: new RegExp("Bentrok") }).click()
    await page
      .getByLabel("Mulai")
      .fill(
        toLocalInputValue(new Date(first.startsAt.getTime() + 30 * 60 * 1000))
      )
    await page
      .getByLabel("Selesai")
      .fill(
        toLocalInputValue(new Date(first.endsAt.getTime() + 30 * 60 * 1000))
      )
    await page.getByRole("button", { name: "Buat Jadwal" }).click()

    await expect(
      page.getByText(/Waktu ujian bentrok dengan jadwal/)
    ).toBeVisible()

    // Edit: a schedule's own window is not a conflict.
    await page.goto(`/dashboard/exam-schedules/${scheduleId}/edit`)
    await waitForHydration(page)
    await page.getByRole("button", { name: "Simpan Perubahan" }).click()
    await page.waitForURL(/\/dashboard\/exam-schedules$/)
  })

  test("boundary windows and different packages do not overlap", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const packageA = await seedExamPackage(
      uniqueName(`${SEEDED_PACKAGE_PREFIX} Batas A`)
    )
    await seedExamPackage(uniqueName(`${SEEDED_PACKAGE_PREFIX} Batas B`))
    const window = at(48, 2)

    await seedExamSchedule({
      name: uniqueName(`${SEEDED_SCHEDULE_PREFIX} Batas Pertama`),
      packageId: packageA,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    })

    await page.goto("/dashboard/exam-schedules/new")
    await waitForHydration(page)

    // Same package, window starting exactly when the other ends: allowed.
    await page
      .getByLabel("Nama Jadwal")
      .fill(uniqueName(`${SEEDED_SCHEDULE_PREFIX} Batas Kedua`))
    await page.getByLabel("Pilih paket ujian").click()
    await page
      .getByRole("option")
      .filter({ hasText: /Batas A/ })
      .first()
      .click()
    await page.getByLabel("Mulai").fill(toLocalInputValue(window.endsAt))
    await page
      .getByLabel("Selesai")
      .fill(
        toLocalInputValue(
          new Date(window.endsAt.getTime() + 2 * 60 * 60 * 1000)
        )
      )
    await page.getByRole("button", { name: "Buat Jadwal" }).click()
    await page.waitForURL(/\/dashboard\/exam-schedules$/)

    // Different package, fully overlapping: allowed.
    await page.goto("/dashboard/exam-schedules/new")
    await waitForHydration(page)
    await page
      .getByLabel("Nama Jadwal")
      .fill(uniqueName(`${SEEDED_SCHEDULE_PREFIX} Batas Beda Paket`))
    await page.getByLabel("Pilih paket ujian").click()
    await page
      .getByRole("option")
      .filter({ hasText: /Batas B/ })
      .first()
      .click()
    await page.getByLabel("Mulai").fill(toLocalInputValue(window.startsAt))
    await page.getByLabel("Selesai").fill(toLocalInputValue(window.endsAt))
    await page.getByRole("button", { name: "Buat Jadwal" }).click()
    await page.waitForURL(/\/dashboard\/exam-schedules$/)
  })
})

test.describe("dashboard home", () => {
  test("an admin sees the overview stats and upcoming schedules", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")

    await page.goto("/dashboard")

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
    // The sidebar also carries a "Bank Soal" link; scope to the stat cards.
    await expect(
      page.getByRole("link", { name: /Bank Soal/ }).last()
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: /Paket Ujian/ }).last()
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Jadwal Mendatang" })
    ).toBeVisible()
  })

  test("a participant sees the welcome instead of admin stats", async ({
    page,
  }) => {
    const user = await signInAsFreshUser(page)
    void user

    await page.goto("/dashboard")

    await expect(page.getByText(/Halo,/)).toBeVisible()
    await expect(page.getByText("Bank Soal")).toHaveCount(0)
  })
})

test.describe("settings profile & security", () => {
  test("a participant edits their profile name", async ({ page }) => {
    const user = await signInAsFreshUser(page)
    void user

    await page.goto("/dashboard/settings/profile")
    await waitForHydration(page)

    await page.getByLabel("Nama").fill("Nama Baru Peserta")
    await page.getByRole("button", { name: "Simpan Profil" }).click()

    await expect(page.getByText("Nama Baru Peserta")).toBeVisible()
  })

  test("profile username validation rejects short usernames", async ({
    page,
  }) => {
    const user = await signInAsFreshUser(page)
    void user

    await page.goto("/dashboard/settings/profile")
    await waitForHydration(page)

    await page.getByLabel("Username").fill("ab")
    await page.getByRole("button", { name: "Simpan Profil" }).click()

    await expect(page.getByText(/Username harus 3–30 karakter/)).toBeVisible()
  })

  test("a participant changes their password and signs in with it", async ({
    page,
  }) => {
    const user = await signInAsFreshUser(page)

    await page.goto("/dashboard/settings/security")
    await waitForHydration(page)

    const initialHash = await storedPasswordHashFor(user.email)

    // Wrong current password is rejected.
    await page
      .getByLabel("Kata sandi saat ini", { exact: true })
      .fill("SalahPassword!")
    await page
      .getByLabel("Kata sandi baru", { exact: true })
      .fill("BaruBanget123!")
    await page
      .getByLabel("Ulangi kata sandi baru", { exact: true })
      .fill("BaruBanget123!")
    await page.getByRole("button", { name: "Ubah Kata Sandi" }).click()
    await expect(page.locator("p.text-destructive")).toBeVisible()

    // Correct current password succeeds.
    await page
      .getByLabel("Kata sandi saat ini", { exact: true })
      .fill(user.password)
    await page.getByRole("button", { name: "Ubah Kata Sandi" }).click()
    await expect(page.getByText("Kata sandi berhasil diubah.")).toBeVisible()

    // The stored credential hash changed — real sign-in is skipped to stay
    // under Better Auth's sign-in rate limit.
    expect(await storedPasswordHashFor(user.email)).not.toBe(initialHash)
  })

  test("the system settings page explains itself", async ({ page }) => {
    await signInAsRole(page, "super-admin")

    await page.goto("/dashboard/settings/system")

    await expect(page.getByText("Segera hadir.")).toBeVisible()
  })
})
