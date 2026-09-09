import type { useTranslations } from "next-intl";
import type { Translator } from "@/lib/types";

type Translate = ReturnType<typeof useTranslations<"stats">>;

/** Shared between the home page and the profile page — same three stats. */
export function getTranslatorStats(t: Translate, translator: Translator) {
  return [
    {
      label: t("booksTranslated"),
      value: t("booksValue", { count: translator.totalBooksTranslated }),
    },
    {
      label: t("yearsActive"),
      value: t("yearsValue", { years: translator.yearsActive }),
    },
    {
      label: t("languagePairs"),
      value: String(translator.languagePairs.length),
    },
  ];
}
