import type { ReactNode } from "react";

/**
 * A pass-through root layout, and the reason `next build` works at all.
 *
 * Every page of this site lives under app/[locale], and that segment's
 * layout is what renders <html lang={locale}> — this one cannot, because it
 * sits above the [locale] segment and so has no locale to put in the tag.
 * (Reading it here with next-intl's getLocale() does work, but it consults
 * request headers, which marks every route dynamic and takes the whole site
 * off the static path: DYNAMIC_SERVER_USAGE on every page.)
 *
 * Next still requires a layout at the root, because app/not-found.tsx sits
 * outside [locale] — nothing has matched a locale yet when it renders.
 * Without this file Next reports
 *
 *     app/not-found.tsx doesn't have a root layout.
 *
 * which is a 500 on every 404 in development, and in `next build` surfaces
 * as the much less obvious "Html should not be imported outside of
 * pages/_document" while prerendering /404 and /500 — Next falling back to
 * the Pages Router's error document because the App Router's has no shell.
 *
 * So this returns children untouched and lets whichever page renders supply
 * its own document.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
