import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { CirclePlay } from "lucide-react";
import type { Taqriz } from "@/lib/types";
import { ScoreBadge } from "@/components/ScoreBadge";
import { safeExternalUrl } from "@/lib/safeUrl";

/**
 * One review, in a list. Used on a book page (where the reviewer is the
 * useful half) and on a reviewer's profile (where the book is), so which
 * heading it leads with follows whichever the API attached.
 */
export function TaqrizCard({
  taqriz,
  context,
  readMoreLabel,
}: {
  taqriz: Taqriz;
  context: "book" | "profile";
  readMoreLabel: string;
}) {
  const showBook = context === "profile" && taqriz.book;
  const video = safeExternalUrl(taqriz.youtubeUrl);

  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {showBook ? (
            <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-stone-100 ring-1 ring-stone-200">
              {taqriz.book?.coverUrl && (
                <Image
                  src={taqriz.book.coverUrl}
                  alt={taqriz.book.uzbekTitle}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              )}
            </div>
          ) : (
            taqriz.taqrizchi && (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-stone-100 border border-stone-200">
                {taqriz.taqrizchi.avatarUrl ? (
                  <Image
                    src={taqriz.taqrizchi.avatarUrl}
                    alt={taqriz.taqrizchi.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-serif text-stone-400">
                    {taqriz.taqrizchi.name.charAt(0)}
                  </span>
                )}
              </div>
            )
          )}

          <div className="min-w-0">
            {showBook && taqriz.book ? (
              <>
                <Link
                  href={`/book/${taqriz.book.id}`}
                  className="font-serif text-base text-zinc-900 hover:text-amber-800 transition-colors line-clamp-1"
                >
                  {taqriz.book.uzbekTitle}
                </Link>
                <p className="text-xs text-zinc-500 truncate">{taqriz.book.author}</p>
              </>
            ) : (
              taqriz.taqrizchi && (
                <>
                  <Link
                    href={`/taqrizchi/${taqriz.taqrizchi.slug}`}
                    className="font-serif text-base text-zinc-900 hover:text-amber-800 transition-colors"
                  >
                    {taqriz.taqrizchi.name}
                  </Link>
                  {taqriz.createdAt && (
                    <p className="text-xs text-zinc-400">
                      {new Date(taqriz.createdAt).getFullYear()}
                    </p>
                  )}
                </>
              )
            )}
          </div>
        </div>

        <ScoreBadge score={taqriz.averageScore} size="sm" />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-zinc-700 line-clamp-4">
        {taqriz.body}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <Link
          href={`/taqriz/${taqriz.id}`}
          className="text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
        >
          {readMoreLabel} →
        </Link>
        {video && (
          <a
            href={video}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-red-600 transition-colors"
          >
            <CirclePlay className="h-3.5 w-3.5" />
            Video
          </a>
        )}
      </div>
    </article>
  );
}
