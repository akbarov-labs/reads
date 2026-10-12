import { sitemapEntries, urlsetXml } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

/** One file of the sitemap index: /sitemaps/pages.xml, /sitemaps/books-1.xml, … */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const entries = await sitemapEntries(name.replace(/\.xml$/, ""));
  if (!entries) return new Response("Not found", { status: 404 });

  return new Response(urlsetXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
