import { defineConfig } from 'playwright/test'

// Puertos dedicados a E2E para no chocar con dev servers de otros proyectos
const API_PORT = 3101
const WEB_PORT = 5199

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    headless: true,
  },
  webServer: [
    {
      command: 'node --import tsx src/server/index.ts',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { TWEAKCV_DATA_DIR: 'data/e2e', PORT: String(API_PORT) },
    } as never,
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { VITE_API_PROXY: `http://localhost:${API_PORT}` },
    } as never,
  ],
})
