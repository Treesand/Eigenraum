/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Nur im Dev-Server: HMR (WebSocket) und React-Preamble erlauben.
// Der Produktions-Build behält die restriktive CSP aus index.html unverändert.
function relaxCspForDevServer(): Plugin {
  return {
    name: "eigenraum-dev-csp",
    apply: "serve",
    transformIndexHtml(html) {
      return html
        .replace("connect-src 'self';", "connect-src 'self' ws: http://localhost:*;")
        .replace("script-src 'self';", "script-src 'self' 'unsafe-inline';");
    },
  };
}

export default defineConfig({
  plugins: [react(), relaxCspForDevServer()],
  build: {
    target: "es2022",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/testing/vitest-setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});
