import { getTranslations } from "next-intl/server";
import type { Author } from "@/lib/types";

export async function AuthorGrid({ authors }: { authors: Author[] }) {
  const t = await getTranslations("authors");

  return (
    <section className="border-t border-zinc-200 py-12 sm:py-16">
      <div className="flex items-baseline justify-between border-b border-zinc-200 pb-4">
        <h2 className="font-serif text-2xl text-zinc-900">{t("sectionTitle")}</h2>
        <span className="text-xs uppercase tracking-widest2 text-zinc-400">
          {t("count", { count: authors.length })}
        </span>
      </div>
      <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {authors.map((author) => (
          <div key={author.name} className="flex items-center justify-between border-b border-zinc-100 py-3">
            <span className="font-serif text-lg text-zinc-800">{author.name}</span>
            <span className="text-xs text-zinc-400">{t("books", { count: author.bookCount })}</span>
          </div>
        ))}
      </div>
    </section>
  );
}