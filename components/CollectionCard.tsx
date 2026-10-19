import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { BookCollection } from "@/lib/types";

/**
 * A collection in a list: its first covers fanned like books on a shelf,
 * the title, the editor's lines and how many books it holds.
 */
export async function CollectionCard({ collection }: { collection: BookCollection }) {
  const t = await getTranslations("collections");
  const covers = (collection.coverUrls ?? []).slice(0, 4);

  return (
    <Link
      href={`/collection/${collection.slug}`}
      className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:border-forest-300"
    >
      <div className="flex h-24 items-end gap-1.5" aria-hidden="true">
        {covers.length > 0 ? (
          covers.map((url, i) => (
            <span
              // By place, not URL: two books can share a cover image.
              key={i}
              className="relative h-full w-16 shrink-0 overflow-hidden rounded-sm bg-stone-100 shadow-sm ring-1 ring-stone-200 transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              <Image src={url} alt="" fill sizes="64px" className="object-cover" />
            </span>
          ))
        ) : (
          <span className="h-full w-16 rounded-sm bg-forest-50 ring-1 ring-stone-200" />
        )}
      </div>
      <h3 className="mt-4 font-serif text-lg leading-snug text-zinc-900 group-hover:text-forest-800 transition-colors">
        {collection.title}
      </h3>
      {collection.description && (
        <p className="mt-1 text-sm leading-relaxed text-zinc-500 line-clamp-2">{collection.description}</p>
      )}
      {collection.bookCount !== undefined && (
        <p className="mt-3 text-xs text-zinc-400">{t("bookCount", { count: collection.bookCount })}</p>
      )}
    </Link>
  );
}
