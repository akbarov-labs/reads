import { getTranslations } from "next-intl/server";
import { SearchBox } from "@/components/SearchBox";

/**
 * The catalogue search: a plain GET form, so it works without JavaScript and
 * the query lands in the URL, where a search can be shared and paged. The
 * books page submits to itself; the home page hero submits to the books
 * page, so a reader can look a book up the moment they arrive.
 */
export async function BookSearchForm({
  action = "",
  defaultValue = "",
  hidden = {},
  large = false,
  className = "",
}: {
  /** Where to search; empty means this page. */
  action?: string;
  defaultValue?: string;
  /** Filters to keep while searching, e.g. the chosen category. */
  hidden?: Record<string, string | undefined>;
  /** The hero's size: taller field, larger type. */
  large?: boolean;
  className?: string;
}) {
  const t = await getTranslations("books");
  const field = large ? "px-4 py-3 text-base" : "px-3 py-2 text-sm";
  const button = large ? "px-5 py-3 text-base" : "px-4 py-2 text-sm";

  return (
    <form action={action} method="get" role="search" className={`flex gap-2 ${className}`}>
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <SearchBox
        name="q"
        defaultValue={defaultValue}
        placeholder={t("searchPlaceholder")}
        className={`rounded-lg border border-stone-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-forest-500 focus:outline-none ${field}`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-lg bg-forest-700 font-medium text-white hover:bg-forest-800 ${button}`}
      >
        {t("search")}
      </button>
    </form>
  );
}
