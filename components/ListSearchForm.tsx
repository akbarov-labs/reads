import { Search } from "lucide-react";

/**
 * A list's own search (authors, publishers, translators): a plain GET form,
 * so it works without JavaScript and the query stays in the URL. Searching
 * starts again from page 1.
 */
export function ListSearchForm({
  defaultValue = "",
  placeholder,
  label,
  button,
  className = "",
}: {
  defaultValue?: string;
  placeholder: string;
  label: string;
  button: string;
  className?: string;
}) {
  return (
    <form method="get" role="search" className={`flex gap-2 ${className}`}>
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-forest-500 focus:outline-none"
        />
      </label>
      <button type="submit" className="shrink-0 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800">
        {button}
      </button>
    </form>
  );
}
