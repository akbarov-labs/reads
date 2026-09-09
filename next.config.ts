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
      // Local dev: Next running on the host, or in its own container
      // reaching Sail on the host.
      { protocol: "http", hostname: "localhost", port: "8000" },
      { protocol: "http", hostname: "host.docker.internal", port: "8000" },
      // Production: API_URL is http://reads-admin-app/api over the shared
      // Docker network, so cover/avatar URLs resolve to that host. The
      // optimizer fetches them server-side; the browser only ever sees
      // same-origin /_next/image URLs. No port here on purpose: :80 is the
      // default for http and normalizes away when the URL is parsed.
      { protocol: "http", hostname: "reads-admin-app" },
    ],
  },
};

export default withNextIntl(nextConfig);
