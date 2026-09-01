import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login, SEEDED_USERS } from "./helpers";

async function scan(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  if (serious.length > 0) {
    console.log(JSON.stringify(serious, null, 2));
  }
  expect(serious, `${serious.length} serious/critical a11y violation(s) — see console output above`).toHaveLength(0);
}

test.describe("accessibility (serious/critical WCAG 2 A/AA violations)", () => {
  test("homepage", async ({ page }) => {
    await page.goto("/");
    await scan(page);
  });

  test("shop listing", async ({ page }) => {
    await page.goto("/shop");
    await scan(page);
  });

  test("a product page", async ({ page }) => {
    await page.goto("/shop");
    await page.locator('a[href^="/shop/"]').first().click();
    await scan(page);
  });

  test("cart", async ({ page }) => {
    await page.goto("/cart");
    await scan(page);
  });

  test("origins", async ({ page }) => {
    await page.goto("/origins");
    await scan(page);
  });

  test("login", async ({ page }) => {
    await page.goto("/login");
    await scan(page);
  });

  test("register", async ({ page }) => {
    await page.goto("/register");
    await scan(page);
  });

  test("checkout (with a real item in the cart)", async ({ page }) => {
    await page.goto("/shop");
    await page.locator('a[href^="/shop/"]').first().click();
    const addToCart = page.getByRole("button", { name: /Add to cart|Out of stock/ });
    if ((await addToCart.innerText()) !== "Out of stock") {
      await addToCart.click();
      await expect(page.getByText("Added to your cart.")).toBeVisible();
    }
    await page.goto("/checkout");
    await scan(page);
  });

  test("account (logged in)", async ({ page }) => {
    await login(page, SEEDED_USERS.customer.email, SEEDED_USERS.customer.password);
    await page.goto("/account");
    await scan(page);
  });

  test("manager dashboard (logged in)", async ({ page }) => {
    await login(page, SEEDED_USERS.manager.email, SEEDED_USERS.manager.password);
    await page.goto("/manager");
    await scan(page);
  });
});
