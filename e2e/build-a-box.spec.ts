import { test, expect } from "@playwright/test";

test("build a box, see it grouped in the cart, and see the discount at checkout", async ({ page }) => {
  await page.goto("/build-a-box");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Pick the first 4 real, in-catalog checkboxes rather than hard-coding
  // product names, so this doesn't silently stop testing anything if the
  // seed data changes.
  const checkboxes = page.getByRole("checkbox");
  const count = await checkboxes.count();
  test.skip(count < 4, "Fewer than 4 Single Origin products in the catalog.");

  for (let i = 0; i < 4; i++) {
    await checkboxes.nth(i).check();
  }

  await expect(page.getByText("4 / 4 selected")).toBeVisible();

  const addToCart = page.getByRole("button", { name: "Add box to cart" });
  await expect(addToCart).toBeEnabled();
  await addToCart.click();

  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByText("Build Your Own Box")).toBeVisible();
  await expect(page.getByText("$65.00")).toBeVisible();

  // Adding to cart opens the cart drawer (CartProvider's cart:updated
  // listener) which overlays the page's own Checkout link — use the
  // drawer's, since it's the one actually on top/interactable.
  await page.getByLabel("Shopping cart").getByRole("link", { name: /Checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByText(/Build Your Own Box \(4 bags, \$65\.00\)/)).toBeVisible();
});
