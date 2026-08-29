import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against the same local Postgres dev database every other
 * verification pass in this project has used (seeded admin/manager/
 * customer accounts, real products) — no separate ephemeral test DB, same
 * pattern as the manual tsx verification scripts run throughout Phases
 * 1-9. `reuseExistingServer` lets this run against an already-running
 * `npm run dev` during local iteration without a slow rebuild each time.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI runs against a real production build (already built by the CI
    // workflow before this step) for deterministic, fast responses; local
    // iteration reuses whatever `npm run dev` is already running, same as
    // every manual verification pass in this project.
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
