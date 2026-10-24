import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BookOpen } from "lucide-react";
import type { Publisher } from "@/lib/types";

interface PublisherCardProps {
  publisher: Publisher;
}

/** Deterministic warm-tone background for publishers without an image. */
function publisherColor(name: string): string {
  // One accent: every placeholder is the same quiet brand tint.
  const colors = ["from-forest-50 to-forest-100 text-forest-800"];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export async function PublisherCard({ publisher }: PublisherCardProps) {
  const t = await getTranslations("publishers");
  const gradientClass = publisherColor(publisher.name);
  const previewCovers = (publisher.coverUrls ?? []).slice(0, 4);

  return (
    <Link href={`/publisher/${publisher.slug}`} className="block">
      <article className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-forest-300 hover:shadow-md transition-all duration-200">
      {/* Publisher header band */}
      <div
        className={`relative h-20 flex items-center px-5 bg-gradient-to-r ${gradientClass}`}
      >
        {publisher.imageUrl ? (
          <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-white shadow-sm border border-white/80 flex-shrink-0">
            <Image
              src={publisher.imageUrl}
              alt={publisher.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-12 w-12 rounded-xl bg-white/70 flex items-center justify-center shadow-sm border border-white/60 flex-shrink-0">
            <BookOpen className="h-6 w-6 opacity-60" />
          </div>
        )}
        <div className="ml-3 min-w-0">
          <h3 className="font-serif text-base font-medium text-zinc-900 leading-snug group-hover:text-forest-800 transition-colors truncate">
            {publisher.name}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {t("books", { count: publisher.bookCount })}
          </p>
        </div>
      </div>

      {/* Book cover strip */}
      {previewCovers.length > 0 && (
        <div className="flex gap-0 h-20">
          {previewCovers.map((coverUrl, i) => (
            <div
              key={coverUrl}
              className="relative flex-1 overflow-hidden"
              style={{ opacity: 1 - i * 0.15 }}
            >
              <Image
                src={coverUrl}
                alt=""
                fill
                sizes="100px"
                className="object-cover"
              />
            </div>
          ))}
          {publisher.bookCount > previewCovers.length && (
            <div className="flex-1 bg-stone-100 flex items-center justify-center text-xs text-zinc-400 font-medium">
              +{publisher.bookCount - previewCovers.length}
            </div>
          )}
        </div>
      )}
    </article>
  </Link>
  );
}
