import { routing } from "@/i18n/routing";
import messages from "@/messages/uz.json";

/**
 * The body of the site's 404, shared by the two boundaries Next can choose
 * between (app/not-found.tsx and app/[locale]/not-found.tsx).
 *
 * Styled inline rather than with Tailwind classes, and with no translation
 * hook, because neither is in scope here: Next renders a not-found boundary
 * *outside* app/[locale]/layout.tsx, which is the file that imports
 * globals.css and mounts NextIntlClientProvider. A 404 page that reaches for
 * either renders as a blank or unstyled document behind a correct 404 status
 * — worse than a plain page, because nothing looks broken from the outside.
 *
 * For the same reason the copy is the default locale's rather than the
 * visitor's: the locale lives in route params a not-found file never
 * receives. It is read from the message catalogue instead of hardcoded, so
 * it stays in step with the rest of the site.
 */
export function NotFoundContent() {
  const t = messages.notFound;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafaf9",
        color: "#18181b",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        padding: "0 24px",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <p style={{ letterSpacing: 4, color: "#a1a1aa", fontSize: 12, margin: 0 }}>404</p>
        <h1 style={{ fontSize: 24, fontWeight: 500, margin: "12px 0 0" }}>{t.title}</h1>
        <p style={{ color: "#52525b", lineHeight: 1.6, margin: "12px 0 0" }}>{t.body}</p>
        <a
          href={`/${routing.defaultLocale}`}
          style={{
            display: "inline-block",
            marginTop: 24,
            padding: "10px 20px",
            borderRadius: 999,
            background: "#18181b",
            color: "#fafaf9",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          {t.home}
        </a>
      </div>
    </div>
  );
}
