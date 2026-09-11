import { getTranslators } from "@/lib/api";
import { routing } from "@/i18n/routing";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * /llms.txt — a plain-text index of the site for language models, following
 * the llmstxt.org convention.
 *
 * HTML is expensive for a model to read: it has to be fetched, stripped and
 * guessed at. This gives the same facts — who each translator is, and every
 * book with its author, publisher and year — as a few hundred bytes of
 * Markdown, which is what gets quoted back when someone asks an assistant
 * who translated a given book into Uzbek.
 *
 * Generated from the same cache-tagged API call as the pages, so it is never
 * out of step with them.
 */
export const revalidate = 300;

function line(value: string | number | null | undefined): string | null {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

export async function GET() {
  const translators = await getTranslators(routing.defaultLocale);
  const visible = translators.filter((translator) => !translator.seo?.noindex);

  const sections: string[] = [
    `# ${SITE_NAME}`,
    "",
    `> Portfolio pages for literary translators: who they are, which languages they work between, and every book they have translated, written or edited. Available in Uzbek (uz), Russian (ru) and English (en).`,
    "",
    `Site: ${SITE_URL}`,
    `Languages: ${routing.locales.join(", ")} — same content, one URL per language (e.g. ${absoluteUrl("uz")}, ${absoluteUrl("en")}).`,
    "",
    "## Translators",
    "",
  ];

  for (const translator of visible) {
    sections.push(
      `- [${translator.name}](${absoluteUrl(routing.defaultLocale, `/translator/${translator.slug}`)}): ${
        translator.seo?.metaDescription ?? translator.bio ?? ""
      }`,
    );
  }

  for (const translator of visible) {
    const pairs = translator.languagePairs
      .map((pair) => `${pair.from} → ${pair.to}`)
      .join("; ");

    sections.push(
      "",
      `## ${translator.name}`,
      "",
      ...[
        line(translator.title) && `Role: ${translator.title}`,
        line(translator.location) && `Location: ${translator.location}`,
        pairs && `Language pairs: ${pairs}`,
        line(translator.startYear) && `Working since: ${translator.startYear}`,
        `Books: ${translator.books.length}`,
        `Profile: ${absoluteUrl(routing.defaultLocale, `/translator/${translator.slug}`)}`,
      ].filter((value): value is string => Boolean(value)),
      "",
    );

    if (translator.bio) {
      sections.push(translator.bio, "");
    }

    if (translator.books.length > 0) {
      sections.push("### Books", "");

      for (const book of translator.books) {
        const credit =
          book.role === "author"
            ? "written by"
            : book.role === "editor"
              ? "edited by"
              : "translated by";

        const details = [
          book.originalTitle && book.originalTitle !== book.uzbekTitle
            ? `original title: ${book.originalTitle}`
            : null,
          book.author ? `author: ${book.author}` : null,
          book.sourceLanguage ? `from: ${book.sourceLanguage}` : null,
          book.publisher ? `publisher: ${book.publisher}` : null,
          book.year ? `year: ${book.year}` : null,
        ].filter(Boolean);

        sections.push(
          `- ${book.uzbekTitle} — ${credit} ${translator.name}${
            details.length > 0 ? ` (${details.join(", ")})` : ""
          }`,
        );
      }

      sections.push("");
    }
  }

  return new Response(sections.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
