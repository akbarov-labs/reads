import Image from "next/image";
import {
  SEARCH_KINDS,
  allResultsPath,
  suggestionPath,
  type SearchBook,
  type SearchKind,
  type SearchOption,
  type SearchPerson,
  type SearchResults,
} from "@/lib/search";

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The search box's dropdown: the best few of each kind, under a heading
 * with how many there are, then a way to the full books listing. Only
 * markup — SearchBox owns the state, and hands in which option the arrow
 * keys are on.
 *
 * Each option is a real link, so a click, a middle-click and "open in new
 * tab" all do what a reader expects; `onPick` is for the plain click, to
 * navigate without a full page load.
 */
export function SearchSuggestions({
  id,
  results,
  options,
  query,
  activeId,
  href,
  onPick,
  t,
}: {
  id: string;
  results: SearchResults;
  options: SearchOption[];
  query: string;
  activeId: string | null;
  /** A site path as a locale-prefixed href. */
  href: (path: string) => string;
  onPick?: (path: string, event: React.MouseEvent<HTMLAnchorElement>) => void;
  t: Translate;
}) {
  const option = (optionId: string, path: string, children: React.ReactNode, className = "") => (
    <a
      key={optionId}
      id={`${id}-${optionId}`}
      role="option"
      aria-selected={activeId === optionId}
      tabIndex={-1}
      href={href(path)}
      onClick={onPick ? (event) => onPick(path, event) : undefined}
      className={`flex items-center gap-3 px-3 py-2 text-left ${
        activeId === optionId ? "bg-forest-100" : "hover:bg-stone-100"
      } ${className}`}
    >
      {children}
    </a>
  );

  if (options.length === 0) {
    return (
      <div id={id} role="listbox" aria-label={t("label")} className={PANEL}>
        <p className="px-3 py-3 text-sm text-zinc-500">{t("noResults", { query })}</p>
      </div>
    );
  }

  return (
    <div id={id} role="listbox" aria-label={t("label")} className={PANEL}>
      {SEARCH_KINDS.filter((kind) => results[kind].items.length > 0).map((kind) => (
        <div key={kind} role="group" aria-labelledby={`${id}-${kind}`} className="py-1">
          <div
            id={`${id}-${kind}`}
            role="presentation"
            className="flex items-baseline justify-between px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400"
          >
            <span>{t(kind)}</span>
            <span className="tabular-nums">{results[kind].total}</span>
          </div>
          {kind === "books"
            ? results.books.items.map((book) =>
                option(`books-${book.id}`, suggestionPath(kind, book), <BookRow book={book} />),
              )
            : results[kind].items.map((person) =>
                option(`${kind}-${person.slug}`, suggestionPath(kind, person), <PersonRow kind={kind} person={person} t={t} />),
              )}
        </div>
      ))}
      {option(
        "all",
        allResultsPath(query),
        <span className="text-sm font-medium text-forest-700">{t("allResults", { query })} →</span>,
        "border-t border-stone-200 py-3",
      )}
    </div>
  );
}

const PANEL =
  "absolute left-0 right-0 top-full z-30 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border border-stone-200 bg-white text-zinc-900 shadow-lg";

function BookRow({ book }: { book: SearchBook }) {
  return (
    <>
      <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded-sm bg-stone-100 ring-1 ring-stone-200">
        {book.coverUrl && <Image src={book.coverUrl} alt="" fill sizes="32px" className="object-cover" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-serif text-sm text-zinc-900">{book.uzbekTitle}</span>
        <span className="block truncate text-xs text-zinc-500">
          {[book.author, book.year].filter(Boolean).join(" · ")}
        </span>
      </span>
    </>
  );
}

function PersonRow({ kind, person, t }: { kind: Exclude<SearchKind, "books">; person: SearchPerson; t: Translate }) {
  // A publisher's logo is a mark, not a face: square, and not cropped.
  const shape = kind === "publishers" ? "rounded-md" : "rounded-full";

  return (
    <>
      <span
        aria-hidden="true"
        className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden bg-stone-100 text-xs font-medium text-zinc-500 ring-1 ring-stone-200 ${shape}`}
      >
        {person.imageUrl ? (
          <Image
            src={person.imageUrl}
            alt=""
            fill
            sizes="32px"
            className={kind === "publishers" ? "object-contain p-0.5" : "object-cover"}
          />
        ) : (
          person.name.charAt(0)
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-zinc-900">{person.name}</span>
        <span className="block text-xs text-zinc-500">{t("bookCount", { count: person.bookCount })}</span>
      </span>
    </>
  );
}
