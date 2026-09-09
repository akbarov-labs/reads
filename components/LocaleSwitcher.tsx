"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<(typeof routing.locales)[number], string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("site");
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("languageLabel")}
      className="flex gap-1 rounded-full border border-zinc-200 p-1"
    >
      {routing.locales.map((code) => (
        <button
          key={code}
          type="button"
          disabled={isPending}
          aria-pressed={code === locale}
          onClick={() =>
            startTransition(() => {
              router.replace(pathname, { locale: code });
            })
          }
          className={`min-w-11 rounded-full px-2.5 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors disabled:opacity-60 ${
            code === locale
              ? "bg-zinc-900 text-stone-50"
              : "text-zinc-500 hover:text-zinc-900"
          }`}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
