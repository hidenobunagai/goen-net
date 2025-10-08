import { expect, test } from "@playwright/test";

const SIGNIN_PATH = "/signin";
const UPDATES_PATH = "/updates";

const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL ?? "";
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD ?? "";

const canAuthenticate = Boolean(TEST_EMAIL && TEST_PASSWORD);

test.describe("Updates dashboard", () => {
  test.skip(
    !canAuthenticate,
    "PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD が未設定のためスキップします。"
  );

  test("allows creating and reviewing an update", async ({ page }) => {
    await page.goto(SIGNIN_PATH);

    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL((url) => url.pathname === UPDATES_PATH, { timeout: 15_000 });

    await page.getByRole("button", { name: /add update/i }).click();
    await page.getByLabel(/本文/i).fill("Playwright test update");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText("Playwright test update")).toBeVisible({ timeout: 10_000 });

    const card = page.locator("text=Playwright test update").first();

    await card.getByRole("button", { name: "Details" }).click();
    await expect(page.getByText("Playwright test update")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
  });
});
