import { test, expect } from "@playwright/test";
import { login, SEEDED_USERS } from "./helpers";

test("a customer is redirected out of both the manager and admin portals", async ({ page }) => {
  await login(page, SEEDED_USERS.customer.email, SEEDED_USERS.customer.password);

  await page.goto("/manager");
  await expect(page).not.toHaveURL(/\/manager$/);

  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin$/);
});

test("a manager reaches the manager portal but is redirected out of the admin-exclusive Users page", async ({ page }) => {
  await login(page, SEEDED_USERS.manager.email, SEEDED_USERS.manager.password);

  await page.goto("/manager");
  await expect(page).toHaveURL(/\/manager$/);
  await expect(page.getByRole("heading", { name: "Operations dashboard" })).toBeVisible();

  await page.goto("/admin/users");
  await expect(page).not.toHaveURL(/\/admin\/users$/);
});

test("an admin reaches both the manager and admin portals, including admin-exclusive pages", async ({ page }) => {
  await login(page, SEEDED_USERS.admin.email, SEEDED_USERS.admin.password);

  await page.goto("/manager");
  await expect(page).toHaveURL(/\/manager$/);

  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/users$/);

  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\/settings$/);
});
