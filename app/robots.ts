import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Crawlers this site explicitly welcomes.
 *
 * `User-agent: *` already allows them, but naming them is the point: these
 * are the crawlers behind ChatGPT, Claude, Perplexity, Gemini grounding and
 * Bing Copilot, and being readable by them is how a translator's name and
 * bibliography end up in an assistant's answer. Spelling it out means a
 * future blanket restriction has to disallow them deliberately rather than
 * by accident.
 */
const ANSWER_ENGINE_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing under /api is content: it is the revalidation webhook.
        // Crawling it wastes crawl budget on a route that returns JSON.
        disallow: ["/api/"],
      },
      ...ANSWER_ENGINE_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/api/"],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
