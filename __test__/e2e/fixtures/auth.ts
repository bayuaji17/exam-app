import { chromium, type Page } from "@playwright/test"
import { existsSync, mkdirSync } from "node:fs"
import path from "node:path"

import { TEST_USERS, type TestUser } from "./test-users"

export type TestRole = TestUser["role"]

const STATE_DIR = path.join(process.cwd(), "__test__/e2e/.auth")

export function getTestUser(role: TestRole): TestUser {
  const user = TEST_USERS.find((candidate) => candidate.role === role)

  if (!user) {
    throw new Error(`No seeded test user for role: ${role}`)
  }

  return user
}

export function storageStatePath(role: TestRole): string {
  return path.join(STATE_DIR, `${role}.json`)
}

/**
 * Fill in the login form and wait for the dashboard.
 */
async function submitLoginForm(page: Page, user: TestUser): Promise<void> {
  await page.goto("/login")
  await page.getByLabel("Email or username").fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill(user.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/dashboard(\/|$)/)
}

/**
 * Sign in once per role during global setup and persist the cookies.
 *
 * Better Auth rate-limits sign-in attempts, so a suite that signs in from
 * every test starts getting 429s partway through. Authenticating once per
 * role and replaying the stored cookies keeps the suite under that limit and
 * makes each test faster.
 *
 * This doubles as the assertion that every seeded role *can* sign in and reach
 * the dashboard: if any role fails here, global setup throws and the whole
 * suite aborts.
 */
export async function createRoleStorageStates(baseURL: string): Promise<void> {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true })
  }

  const browser = await chromium.launch()

  try {
    for (const user of TEST_USERS) {
      const context = await browser.newContext({ baseURL })
      const page = await context.newPage()

      await submitLoginForm(page, user)
      await context.storageState({ path: storageStatePath(user.role) })
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

/**
 * Load a role's saved session into the current page's context.
 */
export async function useRole(page: Page, role: TestRole): Promise<TestUser> {
  const user = getTestUser(role)
  const { cookies } = JSON.parse(
    await import("node:fs/promises").then((fs) =>
      fs.readFile(storageStatePath(role), "utf8")
    )
  )

  await page.context().addCookies(cookies)

  return user
}

/**
 * Sign in through the real login form. Prefer `useRole` unless the test is
 * specifically exercising the login flow, because this counts against Better
 * Auth's sign-in rate limit.
 */
export async function signInAs(page: Page, role: TestRole): Promise<TestUser> {
  const user = getTestUser(role)

  await submitLoginForm(page, user)

  return user
}

/**
 * Clear the session cookie so the next navigation is unauthenticated.
 */
export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies()
}
