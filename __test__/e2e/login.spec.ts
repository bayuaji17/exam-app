import { expect, test } from "@playwright/test"

test("renders the login page", async ({ page }) => {
  await page.goto("/login")

  await expect(
    page.getByRole("heading", { name: "Sign in to Exam App" })
  ).toBeVisible()
  await expect(page.getByLabel("Email")).toBeVisible()
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("checkbox", { name: "Remember me" })
  ).toBeVisible()
  await expect(
    page.getByText("Need help signing in? Contact your administrator.")
  ).toBeVisible()
})
