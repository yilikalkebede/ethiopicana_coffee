import { test, expect } from "@playwright/test";
import { login, SEEDED_USERS } from "./helpers";

test("register, log out, log back in with a fresh account", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel("First name").fill("E2E");
  await page.getByLabel("Last name").fill("Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("SuperSecret123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/register"));

  // Signed in immediately after registration.
  await page.goto("/account");
  await expect(page).toHaveURL(/\/account$/);

  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL("/");

  // Signed out -> /account should now redirect to /login.
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login/);

  // Log back in with the same fresh account.
  await login(page, email, "SuperSecret123!");
  await expect(page).toHaveURL(/\/account$/);
});

test("rejects the wrong password with a real error, no session created", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SEEDED_USERS.customer.email);
  await page.getByLabel("Password").fill("definitely-the-wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
