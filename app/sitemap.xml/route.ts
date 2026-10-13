import { indexXml, sitemapNames } from "@/lib/sitemap";

// Per request, not at build: the build machine cannot reach the API (see
// app/[locale]/layout.tsx). The API calls behind it are data-cached.
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(indexXml(await sitemapNames()), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
