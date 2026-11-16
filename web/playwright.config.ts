import { defineConfig, devices } from "@playwright/test";

// Projects:
//   smoke     — local dev server (started below), no cluster needed.            npm test
//   e2e       — a live workshop instance (E2E_BASE_URL).                        npm run test:e2e
//   isolation — lab mode: attendee A (E2E_BASE_URL + E2E_ACCESS_TOKEN) must not reach attendee B
//               (E2E_PEER_NAMESPACE_PREFIX, e.g. user30).                       npm run test:isolation
//
// Env:
//   E2E_BASE_URL         workshop URL (https://workshop-<ns>.<apps-domain>); unset = local dev server
//   E2E_ACCESS_TOKEN     lab access token → sent as `Authorization: Bearer …` on every request
//   E2E_LAB_MODE=1       lab (multi-tenant) instance: e.g. `oc exec` into a sandbox is expected Forbidden
//   E2E_RUN_MUTATING=1   also run the ordered, mutating lesson flow (creates sandboxes, deploys the
//                        demo app, starts the fleet) — only against a dedicated test instance
//   SMOKE_ACCESS_TOKEN   smoke only: start the local dev server with the access gate ON (this token)
const BASE_URL = process.env.E2E_BASE_URL?.replace(/\/+$/, "");
const SMOKE_TOKEN = BASE_URL ? "" : process.env.SMOKE_ACCESS_TOKEN || "";
const TOKEN = process.env.E2E_ACCESS_TOKEN || SMOKE_TOKEN;
// The site can default to French (WORKSHOP_DEFAULT_LANG); the UI assertions are written against the
// English text, so pin the language cookie (E2E_LANG=fr to browse in French instead).
const LANG_COOKIE = {
  name: "oclaw-lang", value: process.env.E2E_LANG || "en", domain: new URL(BASE_URL || "http://localhost:3000").hostname,
  path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" as const,
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
    storageState: { cookies: [LANG_COOKIE], origins: [] },
    ...(TOKEN ? { extraHTTPHeaders: { Authorization: `Bearer ${TOKEN}` } } : {}),
  },
  projects: [
    { name: "smoke", testMatch: "smoke.spec.ts" },
    { name: "e2e", testMatch: "e2e.spec.ts" },
    { name: "isolation", testMatch: "isolation.spec.ts" },
  ].map((p) => ({ ...p, use: { ...devices["Desktop Chrome"], storageState: { cookies: [LANG_COOKIE], origins: [] } } })),
  ...(BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:3000/healthz",
          env: { LAB_ACCESS_TOKEN: SMOKE_TOKEN, LAB_CWD: process.env.LAB_CWD || process.cwd() },
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
