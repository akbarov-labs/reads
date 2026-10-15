import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Pinned so the tests read the same hosts on any machine or CI runner,
    // whatever the shell exports. API_URL is the production Docker address,
    // the case publicAssetUrl exists to rewrite.
    env: {
      SITE_URL: "https://kitoblarim.uz",
      SITE_NAME: "Kitoblarim",
      API_URL: "http://reads-admin-app/api",
      PUBLIC_ASSET_URL: "https://dashboard.kitoblarim.uz",
    },
  },
});
