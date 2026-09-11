"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { HREFLANG } from "@/lib/site";

const LABELS: Record<(typeof routing.locales)[number], string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

/**
 * Real <a href> links, not buttons.
 *
 * A click handler that calls router.replace() switches languages perfectly
 * well for a visitor with JavaScript, and is invisible to everyone else: a
 * crawler that does not execute JS sees three dead buttons and never
 * discovers that the Russian and English versions of the page exist. The
 * hreflang tags in <head> tell Google about them, but plenty of crawlers —
 * including the ones behind answer engines — follow links and nothing else.
 *
 * As a side effect this also restores what a link normally does: open in a
 * new tab, copy the address, see it in the status bar.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("site");

  return (
    <nav
      aria-label={t("languageLabel")}
      className="flex gap-1 rounded-full border border-zinc-200 p-1"
    >
      {routing.locales.map((code) => {
        const isActive = code === locale;

        return (
          <Link
            key={code}
            href={pathname}
            locale={code}
            hrefLang={HREFLANG[code]}
            aria-current={isActive ? "true" : undefined}
            className={`min-w-11 rounded-full px-2.5 py-1.5 text-center text-xs font-medium uppercase tracking-wide transition-colors ${
              isActive
                ? "bg-zinc-900 text-stone-50"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {LABELS[code]}
          </Link>
        );
      })}
    </nav>
  );
}
