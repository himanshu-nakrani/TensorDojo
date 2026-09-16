import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5190',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'PORT=5190 BASE_PATH=/ pnpm --filter @workspace/tensor-dojo run dev',
    url: 'http://127.0.0.1:5190',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  // OS-agnostic baseline names so the same snapshots work on any
  // platform that runs the visual project (regenerate intentionally
  // after a design change; pixel diffs across font stacks are why the
  // visual suite is opt-in via VISUAL_TESTS=1).
  snapshotPathTemplate:
    '{testDir}/visual.spec.ts-snapshots/{arg}-{projectName}{ext}',
  projects: [
    {
      name: 'chromium',
      // Visual snapshot tests are a separate opt-in suite: baselines
      // are font/AA-sensitive, so `pnpm run test:e2e` stays portable
      // (CI runs the functional suite only).
      ...(process.env.VISUAL_TESTS === '1'
        ? {}
        : { testIgnore: ['**/visual.spec.ts'] }),
      // CI installs Playwright's own browsers. Locally, fall back to the
      // system Chrome when the bundled headless shell isn't installed —
      // override with PW_CHANNEL=chromium to force the bundled build.
      use: {
        ...devices['Desktop Chrome'],
        channel: (process.env.PW_CHANNEL ??
          (process.env.CI ? undefined : 'chrome')) as
          | 'chrome'
          | 'chromium'
          | undefined,
      },
    },
  ],
});
