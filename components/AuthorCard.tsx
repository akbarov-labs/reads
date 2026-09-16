import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Author } from "@/lib/types";

interface AuthorCardProps {
  author: Author;
}

/** Deterministic pastel background from author name for fallback avatar. */
function initialsColor(name: string): string {
  const colors = [
    "bg-amber-100 text-amber-800",
    "bg-stone-200 text-stone-700",
    "bg-orange-100 text-orange-800",
    "bg-yellow-100 text-yellow-800",
    "bg-lime-100 text-lime-800",
    "bg-teal-100 text-teal-800",
    "bg-sky-100 text-sky-800",
    "bg-violet-100 text-violet-800",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export function AuthorCard({ author }: AuthorCardProps) {
  const colorClass = initialsColor(author.name);

  // Up to 3 book cover thumbnails
  const previewBooks = author.books.slice(0, 3).filter((b) => b.coverUrl);

  return (
    <Link href={`/author/${author.slug}`} className="block">
      <article className="group bg-white rounded-2xl border border-stone-200 p-5 hover:border-amber-300 hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-4">
        {/* Author image or initials avatar */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-stone-200">
          {author.imageUrl ? (
            <Image
              src={author.imageUrl}
              alt={author.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <span
              className={`flex h-full w-full items-center justify-center font-serif text-lg font-medium ${colorClass}`}
            >
              {initials(author.name)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base text-zinc-900 leading-snug group-hover:text-amber-800 transition-colors">
            {author.name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            {author.bookCount} book{author.bookCount !== 1 ? "s" : ""} in Uzbek
          </p>
          {author.books[0]?.sourceLanguage && (
            <p className="mt-1 text-[11px] uppercase tracking-wider text-zinc-400">
              {author.books[0].sourceLanguage}
            </p>
          )}
        </div>
      </div>

      {/* Book cover previews */}
      {previewBooks.length > 0 && (
        <div className="mt-4 flex gap-2">
          {previewBooks.map((book) => (
            <div
              key={book.id}
              className="relative h-14 w-9 rounded overflow-hidden bg-stone-100 shadow-sm ring-1 ring-stone-200 flex-shrink-0"
            >
              <Image
                src={book.coverUrl}
                alt={book.uzbekTitle}
                fill
                sizes="36px"
                className="object-cover"
              />
            </div>
          ))}
          {author.books.length > 3 && (
            <div className="h-14 w-9 rounded bg-stone-100 ring-1 ring-stone-200 flex items-center justify-center text-xs text-zinc-400 font-medium flex-shrink-0">
              +{author.books.length - 3}
            </div>
          )}
        </div>
      )}
    </article>
  </Link>
  );
}
