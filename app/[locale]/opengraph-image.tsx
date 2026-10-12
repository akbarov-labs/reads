import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { OG, OG_BOOK_FONT, OG_FONT, OG_SIZE, OgLockup, loadOgFonts } from "@/lib/og";
import { SITE_URL } from "@/lib/site";

/**
 * The share card for pages that have none of their own (the home page and
 * the listings): the Kitoblarim lockup, what the catalogue is, and the
 * promise it hands readers on to in the bot. Pages with their own image
 * (translator cards, admin uploads) override it.
 */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Kitoblarim";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [fonts, tSite, tFooter] = await Promise.all([
    loadOgFonts(),
    getTranslations({ locale, namespace: "site" }),
    getTranslations({ locale, namespace: "footer" }),
  ]);
  const title = tSite("homeTitle").split(" — ").slice(1).join(" — ") || tSite("homeTitle");

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
        <OgLockup section={tSite("brandSection")} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: OG_BOOK_FONT, fontSize: 76, fontWeight: 600, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 1040 }}>
            {title.charAt(0).toUpperCase() + title.slice(1)}
          </div>
          <div style={{ marginTop: 28, fontSize: 32, color: OG.ink2, maxWidth: 900, lineHeight: 1.35 }}>
            {tSite("homeDescription")}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 26,
            borderTop: `2px solid ${OG.line}`,
            fontSize: 28,
          }}
        >
          <span style={{ color: OG.forest, fontWeight: 600 }}>{tFooter("botLead").replace(/:$/, "")}</span>
          <span style={{ color: OG.muted }}>{new URL(SITE_URL).host}</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
