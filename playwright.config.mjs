import { defineConfig } from '@playwright/test';

// Three iPhone-class sizes from the house rules: 375×667, 390×844, 430×932.
const phone = (w, h) => ({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.mjs/,
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:8765', serviceWorkers: 'block' },
  webServer: { command: 'python3 -m http.server 8765', port: 8765, reuseExistingServer: true },
  projects: [
    { name: 'se-375', use: phone(375, 667) },
    { name: 'iphone-390', use: phone(390, 844) },
    { name: 'max-430', use: phone(430, 932) }
  ]
});
