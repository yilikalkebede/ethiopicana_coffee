import { test, expect } from "@playwright/test";
import { login, SEEDED_USERS } from "./helpers";

test("the subscription builder reaches a real Stripe checkout redirect", async ({ page }) => {
  await login(page, SEEDED_USERS.customer.email, SEEDED_USERS.customer.password);

  await page.goto("/subscribe");

  // Step 1: brew method
  await page.getByRole("button", { name: "Drip machine" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2: roast
  await page.getByRole("button", { name: "Medium", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3: flavor (optional, multi-select) — pick one and continue.
  await page.getByRole("button", { name: "fruity" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4: grind
  await page.getByRole("button", { name: "Whole Bean" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 5: ounces
  await page.getByRole("button", { name: "12 oz" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 6: frequency
  await page.getByRole("button", { name: "Every 4 weeks" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 7: review + shipping address, then the real checkout redirect.
  await expect(page.getByRole("heading", { name: "Review your plan" })).toBeVisible();

  const addNewAddress = page.getByRole("button", { name: "+ Add a new address" });
  if (await addNewAddress.isVisible().catch(() => false)) {
    await addNewAddress.click();
  }
  if (await page.getByLabel("First name").isVisible().catch(() => false)) {
    await page.getByLabel("First name").fill("E2E");
    await page.getByLabel("Last name").fill("Tester");
    await page.getByLabel("Address").fill("123 Test St");
    await page.getByLabel("City").fill("Portland");
    await page.getByLabel("State / Province").fill("OR");
    await page.getByLabel("Postal code").fill("97201");
  }

  await page.getByRole("button", { name: "Start My Subscription" }).click();

  // A real Stripe Checkout Session redirect — the flow stops here rather
  // than completing a real payment, same boundary every other phase in
  // this project has used to avoid spending real (even test-mode) money
  // inside an automated run.
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 });
  expect(page.url()).toContain("checkout.stripe.com");
});
