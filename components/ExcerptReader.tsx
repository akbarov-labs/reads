"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Book } from "@/lib/types";

export function ExcerptReader({ books }: { books: Book[] }) {
  const t = useTranslations("excerpt");
  const excerptBooks = useMemo(() => books.filter((b) => b.excerpt), [books]);
  const [activeBookId, setActiveBookId] = useState(excerptBooks[0]?.id);
  const [activePane, setActivePane] = useState<"source" | "translation">(
    "source"
  );

  const activeBook =
    excerptBooks.find((b) => b.id === activeBookId) ?? excerptBooks[0];

  if (!activeBook?.excerpt) return null;

  const { sourceLanguage, sourceText, translatedText } = activeBook.excerpt;

  return (
    <section className="border-t border-zinc-200 py-14 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-serif text-2xl text-zinc-900">
          {t("sectionTitle")}
        </h2>
        {excerptBooks.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {excerptBooks.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => setActiveBookId(book.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  activeBook.id === book.id
                    ? "border-zinc-900 bg-zinc-900 text-stone-50"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                }`}
              >
                {book.uzbekTitle}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-sm text-zinc-500">
        {t("workLabel")}:{" "}
        <span className="font-serif italic">{activeBook.originalTitle}</span>
        , {activeBook.author}
      </p>

      <div className="mt-6 flex gap-1 rounded-full border border-zinc-200 p-1 sm:hidden">
        {(["source", "translation"] as const).map((pane) => (
          <button
            key={pane}
            type="button"
            onClick={() => setActivePane(pane)}
            className={`flex-1 rounded-full py-2 text-xs font-medium uppercase tracking-widest2 transition-colors ${
              activePane === pane
                ? "bg-zinc-900 text-stone-50"
                : "text-zinc-500"
            }`}
          >
            {pane === "source"
              ? t("sourcePaneTab", { language: sourceLanguage })
              : t("translationPaneTab")}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 sm:mt-8 sm:grid-cols-2">
        <div className={activePane === "source" ? "block" : "hidden sm:block"}>
          <p className="text-xs font-medium uppercase tracking-widest2 text-zinc-400">
            {activeBook.role === "author"
              ? t("bookExcerptLabel")
              : t("originalLabel", { language: sourceLanguage })}
          </p>
          <p className="mt-4 font-serif text-lg leading-relaxed text-zinc-800">
            {sourceText}
          </p>
        </div>
        <div
          className={`sm:border-l sm:border-zinc-200 sm:pl-10 ${
            activePane === "translation" ? "block" : "hidden sm:block"
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-widest2 text-zinc-400">
            {activeBook.role === "author"
              ? t("analysisLabel")
              : t("translationLabel")}
          </p>
          <p className="mt-4 font-serif text-lg leading-relaxed text-zinc-800">
            {translatedText}
          </p>
        </div>
      </div>
    </section>
  );
}
