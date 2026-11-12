import { SlidersHorizontal, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { YearCount } from "@/lib/api";

export type FilterOption = { slug: string; name: string; count?: number };

/** What the books page is filtered by: every value as it is in the URL. */
export type BookFilterValues = {
  q?: string;
  category?: string;
  series?: string;
  year?: string;
  publisher?: string;
  author?: string;
  translator?: string;
  sort?: string;
  page?: string;
};

type Labels = Record<
  | "filters"
  | "year"
  | "allYears"
  | "publisher"
  | "allPublishers"
  | "author"
  | "allAuthors"
  | "translator"
  | "allTranslators"
  | "sort"
  | "sortRelevance"
  | "sortYear"
  | "sortTitle"
  | "sortRecent"
  | "apply"
  | "clear"
  | "remove",
  string
>;

/** The keys the panel itself sets; the rest (q, category, series) it keeps. */
const PANEL_KEYS = ["year", "publisher", "author", "translator", "sort"] as const;

/** The books page with these values, empty ones left out. */
export function booksHref(values: BookFilterValues): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/books?${query}` : "/books";
}

/**
 * The books page's filters: printing year, publisher, author, translator
 * and order, as a plain GET form of native selects, so it works without
 * JavaScript and on every phone's own picker. Open when a filter is set.
 * Below it, each active filter is a chip that removes just that one.
 */
export function BookFilterPanel({
  values,
  years,
  publishers,
  authors,
  translators,
  labels,
}: {
  values: BookFilterValues;
  years: YearCount[];
  publishers: FilterOption[];
  authors: FilterOption[];
  translators: FilterOption[];
  labels: Labels;
}) {
  const active = PANEL_KEYS.filter((key) => values[key]);
  const kept = { q: values.q, category: values.category, series: values.series };

  const nameOf = (options: FilterOption[], slug?: string) => options.find((option) => option.slug === slug)?.name ?? slug;
  const chips = [
    values.year && { key: "year", label: values.year },
    values.publisher && { key: "publisher", label: nameOf(publishers, values.publisher) },
    values.author && { key: "author", label: nameOf(authors, values.author) },
    values.translator && { key: "translator", label: nameOf(translators, values.translator) },
  ].filter(Boolean) as { key: keyof BookFilterValues; label: string }[];

  const sortOptions = [
    // With a search, the API's own order is "closest title first";
    // without one, it is newest printing first.
    { value: "", label: values.q ? labels.sortRelevance : labels.sortYear },
    ...(values.q ? [{ value: "year", label: labels.sortYear }] : []),
    { value: "title", label: labels.sortTitle },
    { value: "recent", label: labels.sortRecent },
  ];

  return (
    <div className="mt-5">
      <details open={active.length > 0} className="smooth-details group rounded-2xl border border-stone-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-800 [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-zinc-500" />
          {labels.filters}
          {active.length > 0 ? (
            <span className="rounded-full bg-forest-700 px-2 py-0.5 text-[11px] tabular-nums text-white">{active.length}</span>
          ) : null}
          <span aria-hidden="true" className="ml-auto text-lg leading-none text-zinc-400 transition-transform duration-200 group-open:rotate-45">
            +
          </span>
        </summary>

        <form method="get" action="" className="grid gap-4 border-t border-stone-200 p-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(kept).map(([name, value]) =>
            value ? <input key={name} type="hidden" name={name} value={value} /> : null,
          )}

          <Select name="year" label={labels.year} value={values.year} any={labels.allYears}
            options={years.map(({ year, count }) => ({ value: String(year), label: `${year} (${count})` }))} />
          <Select name="publisher" label={labels.publisher} value={values.publisher} any={labels.allPublishers}
            options={withCounts(publishers)} />
          <Select name="author" label={labels.author} value={values.author} any={labels.allAuthors}
            options={withCounts(authors)} />
          <Select name="translator" label={labels.translator} value={values.translator} any={labels.allTranslators}
            options={withCounts(translators)} />
          <Select name="sort" label={labels.sort} value={values.sort}
            options={sortOptions.filter((option) => option.value !== "")} any={sortOptions[0].label} />

          <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-5">
            <button type="submit" className="rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800">
              {labels.apply}
            </button>
            {active.length > 0 ? (
              <Link href={booksHref(kept)} className="text-sm text-zinc-500 underline-offset-4 hover:text-forest-800 hover:underline">
                {labels.clear}
              </Link>
            ) : null}
          </div>
        </form>
      </details>

      {chips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.key}>
              <Link
                href={booksHref({ ...values, [chip.key]: undefined })}
                aria-label={labels.remove.replace("{name}", chip.label)}
                className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 py-1 pl-3 pr-2 text-xs text-white hover:bg-forest-800"
              >
                {chip.label}
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function withCounts(options: FilterOption[]) {
  return options.map((option) => ({
    value: option.slug,
    label: option.count ? `${option.name} (${option.count})` : option.name,
  }));
}

function Select({
  name,
  label,
  value,
  any,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  any: string;
  options: { value: string; label: string }[];
}) {
  // A value from a link that isn't among the options (an author past the
  // first hundred) still shows, so submitting the form keeps it.
  const known = !value || options.some((option) => option.value === value);

  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-forest-500 focus:outline-none"
      >
        <option value="">{any}</option>
        {!known ? <option value={value}>{value}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
