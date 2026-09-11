import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except static files, Next internals, and API-ish routes.
  //
  // `og` is excluded for the same reason as `api`: it is a route handler, not
  // a page. Left in, the locale middleware would see /og/uz/<slug> as a
  // page missing its locale prefix and 307 the request to /uz/og/uz/<slug>,
  // which is nothing — and a social scraper that follows that redirect gets
  // an HTML error page where it expected an image, so every shared link
  // loses its preview card.
  //
  // Paths containing a dot (robots.txt, sitemap.xml, llms.txt) are already
  // excluded by the `.*\..*` branch.
  matcher: ["/((?!api|og|_next|_vercel|.*\\..*).*)"],
};
