import { getTranslations } from "next-intl/server";
import type { Book } from "@/lib/types";
import { BookCard } from "@/components/BookCard";
import { YearLinks } from "@/components/YearLinks";
import type { YearCount } from "@/lib/api";

/** How many of these books were printed in each year, newest first. */
function yearsOf(books: Book[]): YearCount[] {
  const counts = new Map<number, number>();
  for (const book of books) {
    if (book.year) counts.set(book.year, (counts.get(book.year) ?? 0) + 1);
  }
  return [...counts].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year);
}

/**
 * A profile's books. With `filter` (a translator's slug), year chips above
 * open the books page filtered to them and that year.
 */
export async function BookGrid({ books, filter }: { books: Book[]; filter?: Record<string, string> }) {
  const t = await getTranslations("bookCard");
  const tBooks = await getTranslations("books");

  return (
    <section className="py-14 sm:py-16">
      <div className="flex items-baseline justify-between border-b border-zinc-200 pb-4">
        <h2 className="font-serif text-2xl text-zinc-900">
          {t("sectionTitle")}
        </h2>
        <span className="text-xs uppercase tracking-widest2 text-zinc-400">
          {t("count", { count: books.length })}
        </span>
      </div>
      {filter ? (
        <YearLinks years={yearsOf(books)} filter={filter} label={tBooks("yearsLabel")} moreLabel={tBooks("yearsMore")} className="mt-4" />
      ) : null}
      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}
