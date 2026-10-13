"use client";

import { useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ChevronDown, Globe } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { HREFLANG } from "@/lib/site";

/** Each language by its own name, the way a reader looks for it. */
const NAMES: Record<(typeof routing.locales)[number], string> = {
  uz: "Oʻzbekcha",
  ru: "Русский",
  en: "English",
};

/**
 * The current language by name, opening a short list of the others.
 *
 * Built on <details>, so it opens without JavaScript, and the options are
 * real <a href> links that are always in the DOM: a crawler that runs no JS
 * still finds the Russian and English pages (hreflang in <head> tells Google,
 * but the crawlers behind answer engines follow links and nothing else). The
 * script only adds what <details> lacks: closing on Escape and on a click
 * outside.
 */
export function LocaleSwitcher() {
  const locale = useLocale() as (typeof routing.locales)[number];
  const pathname = usePathname();
  const t = useTranslations("site");
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const close = (event: Event) => {
      if (!details.open) return;
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        details.open = false;
        details.querySelector("summary")?.focus();
        return;
      }
      if (!details.contains(event.target as Node)) details.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className="group relative">
      <summary
        aria-label={`${t("languageLabel")}: ${NAMES[locale]}`}
        className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-stone-100 hover:text-zinc-900 group-open:bg-stone-100 group-open:text-zinc-900 [&::-webkit-details-marker]:hidden"
      >
        <Globe aria-hidden="true" className="h-4 w-4 text-zinc-500" />
        <span lang={locale}>{NAMES[locale]}</span>
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <nav
        aria-label={t("languageLabel")}
        className="absolute right-0 top-full z-30 mt-2 w-44 rounded-xl bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(20,26,22,0.28),0_2px_6px_rgba(20,26,22,0.06)]"
      >
        {routing.locales.map((code) => {
          const isActive = code === locale;
          return (
            <Link
              key={code}
              href={pathname}
              locale={code}
              hrefLang={HREFLANG[code]}
              lang={code}
              aria-current={isActive ? "true" : undefined}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "font-medium text-forest-700"
                  : "text-zinc-700 hover:bg-stone-100 hover:text-zinc-900"
              }`}
            >
              {NAMES[code]}
              {isActive && <Check aria-hidden="true" className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>
    </details>
  );
}
