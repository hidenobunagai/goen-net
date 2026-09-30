import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const SIGNIN_PATH = "/signin";
const UPDATES_PATH = "/updates";
const E2E_EMAIL = "e2e@example.com";

// Google OAuth に実通信しないよう、サーバと同一の NEXTAUTH_SECRET で
// セッション Cookie を直接発行してログイン状態を注入する（storageState 相当）。
async function injectSession(page: Page): Promise<void> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is not set; cannot issue an E2E session cookie");
  }
  const token = await encode({
    token: { name: "E2E Tester", email: E2E_EMAIL, sub: E2E_EMAIL },
    secret,
  });
  const baseURL = test.info().project.use.baseURL ?? "http://localhost:3001";
  const secure = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
  await page.context().addCookies([
    {
      name: secure ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      value: token,
      domain: new URL(baseURL).hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure,
    },
  ]);
}

test("signin page renders the Google sign-in button", async ({ page }) => {
  await page.goto(SIGNIN_PATH);
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
});

test("unauthenticated /updates redirects to /signin", async ({ page }) => {
  await page.goto(UPDATES_PATH);
  await expect(page).toHaveURL((url) => url.pathname === SIGNIN_PATH);
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
});

test("injected session can open /updates", async ({ page }) => {
  await injectSession(page);
  await page.goto(UPDATES_PATH);
  await expect(page).toHaveURL((url) => url.pathname === UPDATES_PATH);
  await expect(page.getByRole("heading", { level: 1, name: "Updates" })).toBeVisible();
});

// 作成（server action）→ 一覧（GET /api/updates）→ 削除（server action）。
// DEGRADE_TO_MEMORY=1 では server action と route handler が別バンドルなので、
// インメモリストアが globalThis 経由で共有されていることも同時に検証する。
test("injected session can create, list, and delete an update", async ({ page }) => {
  // next dev はオンデマンドでコンパイルするため、
  // 作成後の一覧反映（refetch）まで数十秒かかることがある。
  test.slow();

  await injectSession(page);
  await page.goto(UPDATES_PATH);
  await expect(page.getByRole("heading", { level: 1, name: "Updates" })).toBeVisible();

  const title = `E2E update ${Date.now()}`;

  await page.getByRole("button", { name: "Add Update" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Update text").fill("Created by the E2E suite.");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Update added.")).toBeVisible();
  const cardTitle = page.getByText(title, { exact: true });
  await expect(cardTitle).toHaveCount(1, { timeout: 20_000 });

  await cardTitle.click();
  const detailsDialog = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("heading", { level: 2, name: title }) });
  await expect(detailsDialog).toBeVisible();
  await detailsDialog.getByRole("button", { name: "Delete" }).click();

  const confirmDialog = page.getByRole("dialog").filter({ hasText: "Delete update?" });
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText("Update deleted.")).toBeVisible();
  await expect(cardTitle).toHaveCount(0, { timeout: 20_000 });
});
