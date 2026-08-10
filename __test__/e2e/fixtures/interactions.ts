import { expect, type Locator, type Page } from "@playwright/test"

/**
 * Interactions here race with React hydration: the server HTML is interactive
 * to Playwright before the client has attached its handlers, and under
 * parallel load the window widens. A click that lands pre-hydration is lost.
 *
 * The helpers below either verify the interaction had its effect (and retry)
 * or wait for a hydration signal first.
 */

/**
 * Wait until the client has hydrated.
 *
 * The profile button in the dashboard header renders a skeleton on the
 * server and the user's name only after the client session fetch resolves, so
 * its appearance is a reliable hydration signal. It is part of the shell of
 * every dashboard page. Fixture accounts are "Test ...", seeded target
 * accounts are "Target ...", so either pattern identifies it.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await expect(
    page.getByRole("button", { name: /Test |Target / })
  ).toBeVisible({ timeout: 20_000 })
}

/**
 * Click something and confirm the click landed by asserting an effect.
 */
export async function clickAndVerify(
  action: () => Promise<void>,
  verify: () => Promise<void>
): Promise<void> {
  await expect(async () => {
    await action()
    await verify()
  }).toPass({ timeout: 15_000 })
}

/**
 * Open a shadcn Select and choose an option, verifying the trigger updated.
 */
export async function chooseOption(
  page: Page,
  trigger: Locator,
  optionName: string,
  exact = false
): Promise<void> {
  await clickAndVerify(
    async () => {
      await trigger.click()
      await page.getByRole("option", { name: optionName, exact }).click()
    },
    async () => {
      await expect(trigger).toContainText(optionName)
    }
  )
}

/**
 * Click a radio and confirm it became checked.
 */
export async function chooseRadio(page: Page, label: string): Promise<void> {
  await clickAndVerify(
    async () => {
      await page.getByLabel(label).click()
    },
    async () => {
      await expect(page.getByLabel(label)).toBeChecked()
    }
  )
}

/**
 * Submit a form and wait for the navigation it triggers.
 *
 * The caller is expected to have interacted with the form first (which proves
 * hydration), but this also waits for the hydration barrier to be safe. The
 * URL wait is generous: under parallel load the mutation request can take a
 * while to round-trip through the dev server.
 */
export async function submitAndNavigate(
  page: Page,
  buttonName: string,
  destination: RegExp
): Promise<void> {
  await waitForHydration(page)
  await page.getByRole("button", { name: buttonName }).click()
  await expect(page).toHaveURL(destination, { timeout: 30_000 })
}

/**
 * Type into a controlled input and confirm the value survived.
 *
 * A fill that lands before React hydrates is discarded by the first client
 * render, so fill, verify, and retry until the value sticks.
 */
export async function fillField(
  page: Page,
  label: string,
  value: string
): Promise<void> {
  const field = page.getByLabel(label)

  await expect(async () => {
    await field.fill(value)
    await expect(field).toHaveValue(value, { timeout: 500 })
  }).toPass({ timeout: 15_000 })
}
