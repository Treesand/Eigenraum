import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// In manchen Umgebungen liegt ein vorinstalliertes Chromium unter
// /opt/pw-browsers/chromium – dann wird es direkt verwendet statt
// einen Browser-Download zu erzwingen.
const preinstalledChromium = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:4173",
    launchOptions: existsSync(preinstalledChromium)
      ? { executablePath: preinstalledChromium }
      : {},
  },
  webServer: {
    // Dev-Server: aktiviert automatisch den Mock-AI-Provider (kein echter Key im Browser).
    command: "npm run dev -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
