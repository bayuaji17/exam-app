import { expect, test, type Page } from "@playwright/test"

import { getTestUser, signInAsRole } from "./fixtures/auth"
import {
  seedSessionForUser,
  seedTargetUser,
  sessionExists,
  signedSessionCookieValue,
  userIdFor,
} from "./fixtures/created-users"
import { waitForHydration } from "./fixtures/interactions"

const SESSIONS_URL = "/dashboard/settings/sessions"

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

/**
 * Rows are scoped by the seeded IP address rather than the device label: the
 * fixture's own real session also runs a Chrome UA, so a device-based lookup
 * matches every row.
 */
function rowForIp(page: Page, ip: string) {
  return page.locator("tbody tr").filter({ hasText: ip })
}

/**
 * A context acting as "another device": the session token in the cookie.
 *
 * The cookie must be the *signed* form Better Auth issues (`token.signature`),
 * otherwise the server refuses the session.
 */
async function contextWithSessionToken(
  page: Page,
  token: string
): Promise<import("@playwright/test").Page> {
  const context = await page.context().browser()!.newContext({
    baseURL: "http://localhost:3000",
  })
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: signedSessionCookieValue(token),
      domain: "localhost",
      path: "/",
    },
  ])

  return context.newPage()
}

test.describe("session management", () => {
  test("a user sees every active session with device and ip", async ({
    page,
  }) => {
    const user = await userIdFor(getTestUser("user").email)
    const seeded = await seedSessionForUser(user, {
      token: `seed-sessions-${Date.now()}`,
      ipAddress: "203.0.113.9",
      userAgent: CHROME_UA,
    })

    await signInAsRole(page, "user")
    await page.goto(SESSIONS_URL)
    await waitForHydration(page)

    const seededRow = rowForIp(page, "203.0.113.9")

    await expect(seededRow).toBeVisible()
    await expect(seededRow.getByText("Chrome · Windows")).toBeVisible()
    await expect(seededRow.getByRole("button", { name: "Putuskan" })).toBeVisible()

    await expect(page.getByText("Sesi ini")).toBeVisible()
    expect(await sessionExists(seeded.token)).toBe(true)
  })

  test("the current session cannot be revoked", async ({ page }) => {
    await signInAsRole(page, "user")
    await page.goto(SESSIONS_URL)
    await waitForHydration(page)

    const currentRow = page.locator("tbody tr").filter({ hasText: "Sesi ini" })

    await expect(currentRow.getByText("Sesi aktif saat ini")).toBeVisible()
    await expect(currentRow.getByRole("button", { name: "Putuskan" })).toHaveCount(0)
  })

  test("revoking a session removes it and ends the other device", async ({
    page,
  }) => {
    const user = await userIdFor(getTestUser("user").email)
    const seeded = await seedSessionForUser(user, {
      token: `seed-revoke-${Date.now()}`,
      ipAddress: "198.51.100.4",
      userAgent: CHROME_UA,
    })

    await signInAsRole(page, "user")
    await page.goto(SESSIONS_URL)
    await waitForHydration(page)

    const seededRow = rowForIp(page, "198.51.100.4")

    await seededRow.getByRole("button", { name: "Putuskan" }).click()

    await expect(seededRow).toHaveCount(0)
    expect(await sessionExists(seeded.token)).toBe(false)

    const otherDevice = await contextWithSessionToken(page, seeded.token)

    await otherDevice.goto("/dashboard")
    await expect(otherDevice).toHaveURL(/\/login$/)
    await otherDevice.context().close()
  })

  test("an impersonated session names the impersonator", async ({ page }) => {
    const user = await userIdFor(getTestUser("user").email)
    const impersonator = await userIdFor(getTestUser("admin").email)

    const seeded = await seedSessionForUser(user, {
      token: `seed-impersonated-${Date.now()}`,
      ipAddress: "203.0.113.77",
      userAgent: CHROME_UA,
      impersonatedBy: impersonator,
    })

    await signInAsRole(page, "user")
    await page.goto(SESSIONS_URL)
    await waitForHydration(page)

    const seededRow = rowForIp(page, "203.0.113.77")

    await expect(
      seededRow.getByText(`Diimpersonasi oleh ${getTestUser("admin").email}`)
    ).toBeVisible()
    expect(await sessionExists(seeded.token)).toBe(true)
  })

  test("a user with a single session sees the only-session message", async ({
    page,
  }) => {
    const target = await seedTargetUser("single-session", "user")
    const seeded = await seedSessionForUser(target.id, {
      token: `seed-only-${Date.now()}`,
      userAgent: CHROME_UA,
    })

    const onlyDevice = await contextWithSessionToken(page, seeded.token)

    await onlyDevice.goto(SESSIONS_URL)
    await waitForHydration(onlyDevice)

    await expect(
      onlyDevice.getByText("Ini satu-satunya sesi aktif Anda.")
    ).toBeVisible()
    await expect(onlyDevice.locator("tbody tr")).toHaveCount(0)

    await onlyDevice.context().close()
  })

  test("every role can reach the sessions page", async ({ page }) => {
    for (const role of ["user", "admin", "super-admin"] as const) {
      await page.context().clearCookies()
      await signInAsRole(page, role)
      await page.goto(SESSIONS_URL)

      await expect(page).toHaveURL(/\/dashboard\/settings\/sessions$/)
    }
  })
})
