import type { Page } from "@playwright/test"

import { TEST_USERS, type TestUser } from "./test-users"

export type TestRole = TestUser["role"]

export function getTestUser(role: TestRole): TestUser {
  const user = TEST_USERS.find((candidate) => candidate.role === role)

  if (!user) {
    throw new Error(`No seeded test user for role: ${role}`)
  }

  return user
}

/**
 * Sign in through the real login form so the test exercises the same path a
 * person would, and land on the dashboard.
 */
export async function signInAs(page: Page, role: TestRole): Promise<TestUser> {
  const user = getTestUser(role)

  await page.goto("/login")
  await page.getByLabel("Email or username").fill(user.email)
  await page.getByLabel("Password", { exact: true }).fill(user.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL("**/dashboard")

  return user
}

/**
 * Clear the session cookie so the next navigation is unauthenticated.
 */
export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies()
}
