import { defineConfig, devices } from '@playwright/test'

/*
 * End-to-end tests drive the real app in a browser, against a real backend and database.
 *
 * - Locally: start the API (`uv run fastapi dev` in backend/, with the database up) and run
 *   `pnpm test:e2e`; the Vite dev server is started (or reused) on port 5173.
 * - Against the Docker stack: `docker compose up`, then `E2E_BASE_URL=http://localhost:8080
 *   pnpm test:e2e`.
 *
 * Tests create their own uniquely named patients and delete them afterwards, so they don't
 * depend on the seed data and leave nothing behind.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev --port 5173 --strictPort',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
