import { test, expect } from "@playwright/test";
import { login, SEEDED_USERS } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page, SEEDED_USERS.customer.email, SEEDED_USERS.customer.password);
});

test("a logged-in customer can reach their account pages", async ({ page }) => {
  // Login + three sequential first-visit page loads can each pay a Next.js
  // dev-mode compile cost (seconds, not ms) — give this one more headroom
  // than the default 30s rather than flake on a cold dev server.
  test.setTimeout(60_000);

  await page.goto("/account");
  await expect(page).toHaveURL(/\/account$/);

  await page.goto("/account/orders");
  await expect(page).toHaveURL(/\/account\/orders$/);

  await page.goto("/account/notifications");
  await expect(page).toHaveURL(/\/account\/notifications$/);
  // The real preferences form (Phase 9), not a placeholder.
  await expect(page.getByRole("checkbox").first()).toBeVisible();
});
