import type { Page } from "@playwright/test";

// Matches prisma/seed.ts — the same seeded accounts every manual
// verification pass in this project has logged in as.
export const SEEDED_USERS = {
  admin: { email: "admin@latitudecoffee.example", password: "ChangeMe123!" },
  manager: { email: "manager@latitudecoffee.example", password: "ChangeMe123!" },
  customer: { email: "customer@latitudecoffee.example", password: "ChangeMe123!" },
};

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
