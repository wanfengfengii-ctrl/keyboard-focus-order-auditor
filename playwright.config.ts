import { defineConfig } from '@playwright/test';

// 默认本地起 vite preview；Docker 验收时通过 BASE_URL 指向 web 服务。
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    launchOptions: { args: ['--disable-dev-shm-usage'] },
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
