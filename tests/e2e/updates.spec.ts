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
