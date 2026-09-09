import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Reads-admin (Laravel) serves avatars/covers from its public disk.
    // The seeded demo assets are SVG placeholders; real photography can
    // drop the dangerouslyAllowSVG flag later.
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "host.docker.internal", port: "8000" },
    ],
  },
};

export default withNextIntl(nextConfig);
