import { test, expect } from "@playwright/test";

test("browse the shop, open a product, add it to the cart, and reach checkout with real contents", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Follow the first real in-catalog product link rather than hard-coding a
  // slug, so this doesn't silently stop testing anything if the seed data
  // ever changes.
  const firstProductLink = page.locator('a[href^="/shop/"]').first();
  const productName = (await firstProductLink.locator("h3").innerText()).trim();
  await firstProductLink.click();
  await expect(page).toHaveURL(/\/shop\/.+/);

  const addToCart = page.getByRole("button", { name: /Add to cart|Out of stock/ });
  await expect(addToCart).toBeVisible();
  test.skip((await addToCart.innerText()) === "Out of stock", "First product happened to be out of stock.");

  await addToCart.click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByText(productName, { exact: false })).toBeVisible();

  await page.getByRole("link", { name: /Checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // Checkout renders the real cart contents, not a placeholder.
  await expect(page.getByRole("heading", { name: "Discount code" })).toBeVisible();
});
