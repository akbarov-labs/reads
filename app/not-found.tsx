import { routing } from "@/i18n/routing";

/**
 * Last-resort 404, for requests that never reached a locale segment (the
 * i18n middleware rewrites everything else). There is no root layout in this
 * app — app/[locale]/layout.tsx plays that part — so this page has to bring
 * its own <html> and <body>.
 */
export default function GlobalNotFound() {
  return (
    <html lang={routing.defaultLocale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafaf9",
          color: "#18181b",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div>
          <p style={{ letterSpacing: 4, color: "#a1a1aa", fontSize: 12 }}>404</p>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Page not found</h1>
          <a href={`/${routing.defaultLocale}`} style={{ color: "#18181b" }}>
            Go to the home page
          </a>
        </div>
      </body>
    </html>
  );
}
