import { test, expect } from "@playwright/test";

test("the gift card purchase form reaches a real Stripe checkout redirect", async ({ page }) => {
  // Same boundary as subscribe.spec.ts: calls the real Stripe API to create
  // a Checkout Session, so it needs a real (test-mode) key, and the flow
  // stops at the redirect rather than completing a real payment.
  test.skip(!process.env.STRIPE_SECRET_KEY, "Requires a real Stripe test-mode key (STRIPE_SECRET_KEY)");

  await page.goto("/gift-cards");

  await page.getByRole("button", { name: "$50" }).click();
  await page.getByLabel("Your name").fill("E2E Sender");
  await page.getByLabel("Your email").fill("e2e-sender@example.com");
  await page.getByLabel("Recipient email").fill("e2e-recipient@example.com");

  await page.getByRole("button", { name: "Continue to payment" }).click();

  // waitUntil: "commit" — Stripe's Checkout page is heavy and can take a
  // while to reach the default "load" state; the redirect itself (what
  // this test cares about) completes as soon as navigation commits.
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000, waitUntil: "commit" });
  expect(page.url()).toContain("checkout.stripe.com");
});

test("gift card balance lookup reports an invalid code without crashing", async ({ page }) => {
  await page.goto("/gift-cards/balance");

  await page.getByLabel("Gift card code").fill("NOT-A-REAL-CODE");
  await page.getByRole("button", { name: "Check" }).click();

  await expect(page.getByText("We couldn't find that gift card code.")).toBeVisible();
});
