import { expect, test } from "@playwright/test"

test("redirects an unauthenticated visitor to the login page", async ({
  page,
}) => {
  const response = await page.goto("/dashboard")

  await expect(page).toHaveURL(/\/login$/)
  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole("heading", { name: "Sign in to Exam App" })
  ).toBeVisible()
})

test("does not leak dashboard content to an unauthenticated visitor", async ({
  page,
}) => {
  await page.goto("/dashboard")

  await expect(page.getByText("example dashboard")).toHaveCount(0)
  await expect(page.getByText("Not authenticated")).toHaveCount(0)
})
