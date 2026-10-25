import { Link } from "@/i18n/navigation";
import { joinPresent, shortDate } from "@/lib/format";
import type { LibraryAvailability as Availability } from "@/lib/types";

/** Shown before "yana N ta kutubxona"; the rest open in place. */
const SHOWN = 4;

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * "Kutubxonalarda": the libraries that hold this book, whether a copy is on
 * the shelf, and as of when. Nothing at all when none do: "no library has
 * it" is not something a reader needs to read.
 *
 * Status is ink, not colour (the One Accent Rule): a filled forest dot for
 * a copy on the shelf, a hollow one for all lent out. The library's name is
 * the link, as everywhere else.
 */
export function LibraryAvailability({
  libraries,
  locale,
  t,
  className = "",
}: {
  libraries: Availability[] | undefined;
  locale: string;
  t: T;
  className?: string;
}) {
  if (!libraries || libraries.length === 0) return null;

  const shown = libraries.slice(0, SHOWN);
  const rest = libraries.slice(SHOWN);

  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-zinc-900">{t("libTitle")}</h3>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">{t("libLead")}</p>
      <ul className="mt-3 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {shown.map((library) => (
          <LibraryRow key={library.slug} library={library} locale={locale} t={t} />
        ))}
      </ul>
      {rest.length > 0 ? (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-forest-700 hover:text-forest-800 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{t("libMore", { count: rest.length })}</span>
          </summary>
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {rest.map((library) => (
              <LibraryRow key={library.slug} library={library} locale={locale} t={t} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function LibraryRow({ library, locale, t }: { library: Availability; locale: string; t: T }) {
  const available = library.copiesAvailable > 0;
  const checked = shortDate(library.updatedAt, locale);

  return (
    <li className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <Link
          href={`/library/${library.slug}`}
          className="font-serif text-base text-zinc-900 hover:text-forest-800"
        >
          {library.name}
        </Link>
        <p className="mt-0.5 text-xs text-zinc-500">
          {joinPresent([library.district ?? library.region, checked ? t("libChecked", { date: checked }) : null])}
          {library.stale ? <span className="text-zinc-600"> · {t("libStale")}</span> : null}
        </p>
      </div>
      <p className="flex shrink-0 items-center gap-1.5 pt-0.5 text-sm tabular-nums text-zinc-700">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${available ? "bg-forest-700" : "border border-stone-300"}`}
        />
        {available ? t("libAvailable", { count: library.copiesAvailable }) : t("libAllOut")}
      </p>
    </li>
  );
}
