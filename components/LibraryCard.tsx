import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Library as LibraryIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Library } from "@/lib/types";

/**
 * A library on the list: photo, name, district, how many books, and the
 * address a reader needs to find the door. A flat white plate that lifts
 * on hover (the Flat Plate Rule).
 */
export async function LibraryCard({ library }: { library: Library }) {
  const t = await getTranslations("libraries");

  return (
    <Link href={`/library/${library.slug}`} className="group block h-full">
      <article className="flex h-full gap-4 rounded-2xl border border-stone-200 bg-white p-5 transition-all duration-200 group-hover:border-forest-300 group-hover:shadow-md">
        {library.photoUrl ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100">
            <Image src={library.photoUrl} alt="" fill sizes="64px" className="object-cover" />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-forest-50">
            <LibraryIcon aria-hidden="true" className="h-7 w-7 text-forest-700" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="font-serif text-lg leading-snug text-zinc-900 transition-colors group-hover:text-forest-800">
              {library.name}
            </h2>
            {library.district ? (
              <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs text-zinc-600">
                {library.district}
              </span>
            ) : null}
          </div>
          {typeof library.bookCount === "number" ? (
            <p className="mt-1 text-sm text-zinc-500">{t("books", { count: library.bookCount })}</p>
          ) : null}
          {library.address ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 line-clamp-3">{library.address}</p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
