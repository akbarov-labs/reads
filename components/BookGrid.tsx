import { getTranslations } from "next-intl/server";
import type { Book } from "@/lib/types";
import { BookCard } from "@/components/BookCard";

export async function BookGrid({ books }: { books: Book[] }) {
  const t = await getTranslations("books");

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
      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}
