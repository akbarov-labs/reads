import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

/**
 * The visitor's own browser posts the inquiry form straight to Reads-admin,
 * which is a different origin, so connect-src has to name it. Falls back to
 * 'self' only, which is correct for a deployment where nothing calls out.
 */
function apiOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_API_URL;

  if (!url) return null;

  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy.
 *
 * script-src keeps 'unsafe-inline' on purpose. The alternative — a per-request
 * nonce — requires reading request headers during render, which opts every
 * page out of Next's full route cache and turns a statically served,
 * instantly-crawlable site into a dynamic one. For a site whose pages contain
 * no visitor-supplied HTML, that trade is not worth it. The directives that
 * do the real work here are the ones an XSS payload would need next:
 * object-src, base-uri, form-action and frame-ancestors.
 */
function contentSecurityPolicy(): string {
  const api = apiOrigin();

  return [
    "default-src 'self'",
    // 'unsafe-eval' is only ever added in development, where Next's hot
    // reloader needs it. It never reaches a production response.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Covers and avatars are proxied through /_next/image, so they are
    // same-origin by the time a browser sees them; blob:/data: cover the
    // image optimizer's own output and inlined SVG icons.
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${api ? ` ${api}` : ""}${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Redundant next to frame-ancestors for modern browsers, still read by
  // older ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Nothing gains from announcing the framework in every response.
  poweredByHeader: false,
  images: {
    // Reads-admin (Laravel) serves avatars/covers from its public disk.
    // The seeded demo assets are SVG placeholders; real photography can
    // drop the dangerouslyAllowSVG flag later.
    dangerouslyAllowSVG: true,
    // dangerouslyAllowSVG means the optimizer will pass through a file that
    // can carry <script>. Next applies a default sandbox policy, but pinning
    // it here means an upstream default change cannot quietly loosen it:
    // whatever an uploaded SVG contains, it renders inert and same-origin
    // cookies stay out of reach.
    contentSecurityPolicy:
      "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    contentDispositionType: "attachment",
    // WebP only, deliberately. AVIF would shave roughly another 20% off
    // each cover, but encoding it costs far more memory than WebP, and this
    // container runs under `mem_limit: 256m` (docker-compose.prod.yml) —
    // a few covers optimising at once could get the process OOM-killed. A
    // site that intermittently fails to render is a much worse ranking
    // signal than an image 20% larger than it had to be.
    formats: ["image/webp"],
    // Next re-optimises an image once its cache entry expires, and the
    // default TTL is 60s -- on a low-traffic site that means re-encoding
    // the same avatars and covers over and over. These only change when a
    // translator uploads a replacement, which produces a new filename (and
    // therefore a new URL), so caching them hard is safe.
    minimumCacheTTL: 60 * 60 * 24 * 30,
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
      // The public admin host, used when an admin uploads a share image:
      // og:image has to be an absolute URL a scraper can fetch.
      { protocol: "https", hostname: "dashboard.kitoblarim.uz" },
    ],
  },
  async headers() {
    return [
      {
        // Everything, including the sitemap, robots.txt and llms.txt.
        source: "/:path*",
        headers: securityHeaders,
      },
      // HSTS belongs only on responses that actually travelled over TLS. In
      // production this app always sits behind Caddy, which terminates it;
      // in local development it is served over plain http, and pinning
      // localhost to https would break every other project on the machine.
      // The whole entry is dropped in development rather than emptied —
      // Next rejects a route with an empty `headers` array outright.
      ...(isDev
        ? []
        : [
            {
              source: "/:path*",
              headers: [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ],
            },
          ]),
    ];
  },
};

export default withNextIntl(nextConfig);
