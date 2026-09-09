import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Book } from "@/lib/types";

export async function BookCard({ book }: { book: Book }) {
  const t = await getTranslations("books");

  const roleLabel =
    book.role === "author"
      ? t("roleAuthor")
      : book.role === "editor"
      ? t("roleEditor")
      : t("roleTranslator");

  const roleStyle =
    book.role === "author"
      ? "bg-amber-100/90 text-amber-900 border-amber-300"
      : book.role === "editor"
      ? "bg-emerald-50/90 text-emerald-800 border-emerald-200"
      : "bg-white/90 text-zinc-700 border-zinc-200";

  return (
    <article className="group">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-zinc-100 shadow-sm ring-1 ring-zinc-200 transition-shadow group-hover:shadow-md">
        <Image
          src={book.coverUrl}
          alt={t("coverAlt", { title: book.uzbekTitle })}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
        />
        <div className="absolute top-2.5 left-2.5">
          <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide shadow-xs backdrop-blur-xs ${roleStyle}`}>
            {roleLabel}
          </span>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-serif text-lg leading-snug text-zinc-900">
          {book.uzbekTitle}
        </h3>
        <p className="mt-0.5 font-serif text-sm italic text-zinc-500">
          {book.originalTitle}
        </p>
        <p className="mt-2 text-xs uppercase tracking-widest2 text-zinc-400">
          {book.author}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          {book.publisher} · {book.year}
        </p>
      </div>
    </article>
  );
}
