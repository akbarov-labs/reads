"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, useRouter } from "@/i18n/navigation";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import {
  DEBOUNCE_MS,
  moveActive,
  normalizeQuery,
  searchOptions,
  type SearchResults,
} from "@/lib/search";

/**
 * The catalogue search field, with grouped suggestions as you type: books,
 * authors, translators and publishers at once. It sits inside
 * BookSearchForm's plain GET form, so Enter on the text (or no JavaScript at
 * all) still opens the books listing for it; Enter on a highlighted
 * suggestion opens that instead.
 *
 * Asks the site's own /api/search, a quarter of a second after the last
 * keystroke, and remembers every answer for the visit, so backspacing over
 * a word costs nothing.
 */
export function SearchBox({
  name,
  defaultValue = "",
  placeholder,
  className = "",
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
  className?: string;
}) {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const listboxId = useId();

  const [value, setValue] = useState(defaultValue);
  const [answer, setAnswer] = useState<{ query: string; results: SearchResults } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const answers = useRef(new Map<string, SearchResults>());

  const query = normalizeQuery(value);

  useEffect(() => {
    if (!query) {
      setAnswer(null);
      return;
    }

    const known = answers.current.get(query);
    if (known) {
      setAnswer({ query, results: known });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?${new URLSearchParams({ q: query })}`, {
          signal: controller.signal,
        });
        // A 429 or an outage: keep what is showing; the form still works.
        if (!response.ok) return;

        const results = (await response.json()) as SearchResults;
        answers.current.set(query, results);
        setAnswer({ query, results });
      } catch {
        // Aborted by the next keystroke, or offline.
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Still showing the last answer while the next one is on its way, so the
  // list does not blink at every letter; but "nothing found" only for the
  // text actually typed.
  const results = query ? answer?.results : undefined;
  const options = useMemo(() => (results && answer ? searchOptions(results, value) : []), [results, answer, value]);
  const showing = open && results !== undefined && (options.length > 0 || answer?.query === query);
  const activeOption = showing && active >= 0 ? options[active] : undefined;

  useEffect(() => setActive(-1), [answer]);

  const href = useCallback((path: string) => getPathname({ href: path, locale }), [locale]);

  const pick = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router],
  );

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((current) => moveActive(current, options.length, event.key as "ArrowDown" | "ArrowUp"));
    } else if (event.key === "Enter" && activeOption) {
      event.preventDefault();
      pick(activeOption.path);
    } else if (event.key === "Escape" && showing) {
      // The first Escape closes the list; a second one clears the field, as
      // a search input does on its own.
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div
      className="relative min-w-0 flex-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <input
        type="search"
        name={name}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showing}
        aria-controls={listboxId}
        aria-activedescendant={activeOption ? `${listboxId}-${activeOption.id}` : undefined}
        className={`w-full ${className}`}
      />
      {showing && results && (
        // Keeps focus in the field while a suggestion is clicked, so the
        // blur above does not close the list before the click lands.
        <div onMouseDown={(event) => event.preventDefault()}>
          <SearchSuggestions
            id={listboxId}
            results={results}
            options={options}
            query={value.trim()}
            activeId={activeOption?.id ?? null}
            href={href}
            onPick={(path, event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault();
              pick(path);
            }}
            t={t}
          />
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {showing
          ? options.length > 0
            ? t("suggestions", { count: options.length - 1 })
            : t("noResults", { query: value.trim() })
          : ""}
      </p>
    </div>
  );
}
