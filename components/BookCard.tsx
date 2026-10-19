import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Book } from "@/lib/types";

export async function BookCard({ book }: { book: Book }) {
  const t = await getTranslations("bookCard");

  // No badge when nobody is credited: an Uzbek original is not a translation.
  const roleLabel =
    book.role === "author"
      ? t("roleAuthor")
      : book.role === "editor"
      ? t("roleEditor")
      : book.role === "translator"
      ? t("roleTranslator")
      : null;

  const roleStyle =
    book.role === "author"
      ? "bg-forest-100/90 text-forest-900 border-forest-300"
      : book.role === "editor"
      ? "bg-forest-50/90 text-forest-800 border-forest-200"
      : "bg-white/90 text-zinc-700 border-zinc-200";

  return (
    <Link href={`/book/${book.id}`} className="block group">
      <article>
      {/* Lifted off the shelf when touched or hovered, as in the bot. */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm bg-zinc-100 shadow-sm ring-1 ring-zinc-200 transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-active:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={t("coverAlt", { title: book.uzbekTitle })}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center font-serif text-sm text-stone-400">
            {book.uzbekTitle}
          </div>
        )}
        {roleLabel && (
          <div className="absolute top-2.5 left-2.5">
            <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide shadow-sm backdrop-blur-sm ${roleStyle}`}>
              {roleLabel}
            </span>
          </div>
        )}
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
          {[book.publisher, book.year].filter(Boolean).join(" · ")}
        </p>
      </div>
    </article>
  </Link>
  );
}
