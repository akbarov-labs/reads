import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getTranslatorBySlug } from "@/lib/api";
import { routing } from "@/i18n/routing";
import { SITE_NAME } from "@/lib/site";

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

const WIDTH = 1200;
const HEIGHT = 630;

const FONT_FILES = [
  { name: "Inter", file: "inter-latin-400-normal.woff", weight: 400 },
  { name: "Inter", file: "inter-latin-600-normal.woff", weight: 600 },
  // Uzbek Latin (oʻ, gʻ) lives in latin-ext, Russian in cyrillic. Satori
  // falls through this list per glyph, so a name in any of the three
  // scripts renders instead of turning into boxes.
  { name: "InterExt", file: "inter-latin-ext-400-normal.woff", weight: 400 },
  { name: "InterExt", file: "inter-latin-ext-600-normal.woff", weight: 600 },
  { name: "InterCyr", file: "inter-cyrillic-400-normal.woff", weight: 400 },
  { name: "InterCyr", file: "inter-cyrillic-600-normal.woff", weight: 600 },
] as const;

const FONT_STACK = "Inter, InterExt, InterCyr";

// Read once per process, not once per request: these files never change.
let fontsPromise: Promise<
  { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }[]
> | null = null;

function loadFonts() {
  fontsPromise ??= Promise.all(
    FONT_FILES.map(async ({ name, file, weight }) => ({
      name,
      // public/ ships with the standalone build, so this path resolves both
      // in `next dev` and inside the production container.
      data: (await readFile(
        path.join(process.cwd(), "public", "fonts", file),
      )) as unknown as ArrayBuffer,
      weight: weight as 400 | 600,
      style: "normal" as const,
    })),
  );

  return fontsPromise;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return new Response("Not found", { status: 404 });
  }

  const [translator, fonts, t] = await Promise.all([
    getTranslatorBySlug(slug, locale),
    loadFonts(),
    // The card is per-locale, so its one label should be too — a Russian
    // share preview reading "books & translations" undercuts the page it
    // is previewing.
    getTranslations({ locale, namespace: "stats" }),
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
          backgroundColor: "#fafaf9",
          color: "#18181b",
          padding: "72px 80px",
          fontFamily: FONT_STACK,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#a1a1aa",
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 84,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            {translator.name}
          </div>
          {translator.title ? (
            <div style={{ marginTop: 18, fontSize: 36, color: "#52525b" }}>
              {translator.title}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {pairs ? (
            <div style={{ fontSize: 28, color: "#71717a" }}>{pairs}</div>
          ) : null}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 26,
              paddingTop: 26,
              borderTop: "2px solid #e4e4e7",
              fontSize: 30,
              color: "#3f3f46",
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {translator.totalBooksTranslated}
            </span>
            <span style={{ marginLeft: 12 }}>{t("booksTranslated")}</span>
            {translator.location ? (
              <span style={{ marginLeft: 32, color: "#a1a1aa" }}>
                {translator.location}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
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
