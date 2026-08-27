import { randomUUID } from "node:crypto"
import { expect, test, type Page } from "@playwright/test"

import { signInAsRole } from "./fixtures/auth"
import {
  groupMemberIds,
  seedParticipantGroup,
  SEEDED_GROUP_PREFIX,
} from "./fixtures/seeded-groups"
import { userExists } from "./fixtures/created-users"
import {
  buildImportWorkbook,
  importFile,
  importHistoryCount,
} from "./fixtures/import-files"
import { waitForHydration } from "./fixtures/interactions"

const IMPORT_URL = "/dashboard/users/import"

function uniqueEmail(label: string): string {
  return `e2e-created-import-${label}-${randomUUID().slice(0, 8)}@example.com`
}

async function uploadFile(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer }
) {
  await page.goto(IMPORT_URL)
  await waitForHydration(page)
  await page.setInputFiles('input[type="file"]', file)
}

test.describe("participant import", () => {
  test("a valid file creates accounts, group memberships, and a history row", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const groupName = `${SEEDED_GROUP_PREFIX} ${uniqueEmail("grup")}`
    const groupId = await seedParticipantGroup(groupName)
    const firstEmail = uniqueEmail("satu")
    const secondEmail = uniqueEmail("dua")

    await uploadFile(
      page,
      importFile(
        "peserta.xlsx",
        await buildImportWorkbook([
          {
            name: "Peserta Satu",
            email: firstEmail,
            nisn: 1_000_000_101,
            groups: groupName,
          },
          {
            name: "Peserta Dua",
            email: secondEmail,
            nisn: 1_000_000_102,
            password: "Rahasia123!",
          },
        ])
      )
    )

    // Dry-run: everything valid, import enabled.
    await expect(page.getByText(/Semua Valid/)).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Import 2 Peserta/ })
    ).toBeEnabled()

    await page.getByRole("button", { name: /Import 2 Peserta/ }).click()

    await expect(page.getByText(/Sebanyak 2 peserta berhasil/)).toBeVisible()
    await expect(page.getByText(firstEmail)).toBeVisible()
    await expect(page.getByText("Rahasia123!")).toHaveCount(0)

    expect(await userExists(firstEmail)).toBe(true)
    expect(await userExists(secondEmail)).toBe(true)
    expect(await groupMemberIds(groupId)).not.toHaveLength(0)
    expect(await importHistoryCount("import-%")).toBeGreaterThan(0)
  })

  test("one invalid row blocks the whole import and lists errors", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const goodEmail = uniqueEmail("baik")
    const badEmail = uniqueEmail("buruk")

    await uploadFile(
      page,
      importFile(
        "campur.xlsx",
        await buildImportWorkbook([
          { name: "Peserta Baik", email: goodEmail, nisn: 1_000_000_103 },
          { name: "", email: badEmail, nisn: 1_000_000_104 },
        ])
      )
    )

    await expect(page.getByText(/1 Masalah Ditemukan/)).toBeVisible()
    await expect(page.getByText("Baris 3")).toBeVisible()
    await expect(page.getByText("Nama wajib diisi.")).toBeVisible()
    await expect(page.getByRole("button", { name: /Import/ })).toBeDisabled()

    expect(await userExists(goodEmail)).toBe(false)
  })

  test("an email already in the database blocks the import", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")
    const freshEmail = uniqueEmail("baru")

    await uploadFile(
      page,
      importFile(
        "duplikat.xlsx",
        await buildImportWorkbook([
          {
            name: "Sudah Ada",
            email: "test-user@example.com",
            nisn: 1_000_000_105,
          },
          { name: "Peserta Baru", email: freshEmail, nisn: 1_000_000_106 },
        ])
      )
    )

    await expect(page.getByText("Email sudah terdaftar.")).toBeVisible()
    await expect(page.getByRole("button", { name: /Import/ })).toBeDisabled()
  })

  test("unknown group names are flagged", async ({ page }) => {
    await signInAsRole(page, "admin")

    await uploadFile(
      page,
      importFile(
        "grup.xlsx",
        await buildImportWorkbook([
          {
            name: "Peserta",
            email: uniqueEmail("grup"),
            nisn: 1_000_000_107,
            groups: "Tidak Ada",
          },
        ])
      )
    )

    await expect(
      page.getByText('Grup "Tidak Ada" tidak ditemukan.')
    ).toBeVisible()
    await expect(page.getByRole("button", { name: /Import/ })).toBeDisabled()
  })

  test("a NISN duplicated in the file blocks the import", async ({ page }) => {
    await signInAsRole(page, "admin")

    await uploadFile(
      page,
      importFile(
        "nisn-duplikat.xlsx",
        await buildImportWorkbook([
          {
            name: "Peserta A",
            email: uniqueEmail("nisna"),
            nisn: 1_000_000_201,
          },
          {
            name: "Peserta B",
            email: uniqueEmail("nisnb"),
            nisn: 1_000_000_201,
          },
        ])
      )
    )

    await expect(page.getByText("NISN duplikat di dalam file.")).toBeVisible()
    await expect(page.getByRole("button", { name: /Import/ })).toBeDisabled()
  })

  test("wrong file types and oversized files are rejected", async ({
    page,
  }) => {
    await signInAsRole(page, "admin")

    await uploadFile(page, {
      name: "peserta.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("a,b"),
    })
    await expect(
      page.getByText("Hanya file .xlsx yang didukung.").first()
    ).toBeVisible()

    await page.setInputFiles("input[type=file]", {
      name: "besar.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    })
    await expect(page.getByText("File maksimal 2 MB.").first()).toBeVisible()
  })

  test("the template downloads", async ({ page }) => {
    await signInAsRole(page, "admin")

    const response = await page.request.get("/api/participants/template")
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("spreadsheetml.sheet")
  })

  test("a participant cannot reach the import page", async ({ page }) => {
    await signInAsRole(page, "user")

    await page.goto(IMPORT_URL)

    await expect(page.getByText("Access denied")).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard\/forbidden/)
  })
})
