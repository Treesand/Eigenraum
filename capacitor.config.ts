import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "de.eigenraum.app",
  appName: "Eigenraum",
  webDir: "dist",
  ios: {
    contentInset: "always",
  },
};

export default config;
