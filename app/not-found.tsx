import { routing } from "@/i18n/routing";
import { NotFoundContent } from "@/components/NotFoundPage";

/**
 * 404 for a URL that matched no route — including everything the i18n
 * middleware rewrote into a locale that no page then claimed.
 *
 * Brings its own <html>/<body>: app/layout.tsx passes children straight
 * through, so this page *is* the document. The sibling boundary at
 * app/[locale]/translator/[slug]/not-found.tsx must not, because that one
 * renders inside the locale layout's shell.
 */
export default function GlobalNotFound() {
  return (
    <html lang={routing.defaultLocale}>
      <body style={{ margin: 0 }}>
        <NotFoundContent />
      </body>
    </html>
  );
}
