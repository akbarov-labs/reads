import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getTranslatorBySlug } from "@/lib/api";
import { routing } from "@/i18n/routing";
import { OG, OG_BOOK_FONT, OG_FONT, OG_SIZE, OgLockup, loadOgFonts } from "@/lib/og";

/**
 * The social-preview card for a profile, drawn on demand.
 *
 * Takes only a locale and a slug — never caption text — so it cannot be used
 * as a generator for arbitrary wording on this domain, which is what an
 * open `/og?title=...` endpoint would be. Everything on the card is read
 * from the profile, so the book count on a shared link is right without
 * anyone re-exporting an image.
 *
 * An admin who uploads a share image in the panel bypasses this entirely
 * (see ogImage() in lib/seo.ts).
 */
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return new Response("Not found", { status: 404 });
  }

  const [translator, fonts, t, tSite] = await Promise.all([
    getTranslatorBySlug(slug, locale),
    loadOgFonts(),
    // The card is per-locale, so its one label should be too — a Russian
    // share preview reading "books & translations" undercuts the page it
    // is previewing.
    getTranslations({ locale, namespace: "stats" }),
    getTranslations({ locale, namespace: "site" }),
  ]);

  if (!translator) {
    return new Response("Not found", { status: 404 });
  }

  const pairs = translator.languagePairs
    .slice(0, 3)
    .map((pair) => `${pair.from} → ${pair.to}`)
    .join("   ·   ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: OG.paper,
          color: OG.ink,
          padding: "72px 80px",
          fontFamily: OG_FONT,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <OgLockup section={tSite("brandSection")} />
          <div
            style={{
              marginTop: 56,
              fontFamily: OG_BOOK_FONT,
              fontSize: 84,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {translator.name}
          </div>
          {translator.title ? (
            <div style={{ marginTop: 18, fontSize: 36, color: OG.ink2 }}>
              {translator.title}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {pairs ? (
            <div style={{ fontSize: 28, color: OG.muted }}>{pairs}</div>
          ) : null}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 26,
              paddingTop: 26,
              borderTop: `2px solid ${OG.line}`,
              fontSize: 30,
              color: OG.ink2,
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {translator.totalBooksTranslated}
            </span>
            <span style={{ marginLeft: 12 }}>{t("booksTranslated")}</span>
            {translator.location ? (
              <span style={{ marginLeft: 32, color: OG.muted }}>
                {translator.location}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts,
      headers: {
        // Scrapers re-fetch this on every share. The content only changes
        // when the profile does, and a stale card for a few minutes is
        // harmless, so let every layer in front of it cache hard.
        "Cache-Control":
          "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}
