import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the production build (`next start`) so drafts are
 * excluded exactly as they will be in deployment.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3311",
    trace: "retain-on-failure",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "pnpm exec next start -p 3311",
    url: "http://localhost:3311",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
