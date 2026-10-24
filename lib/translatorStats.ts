import type { useTranslations } from "next-intl";
import type { Translator } from "@/lib/types";

type Translate = ReturnType<typeof useTranslations<"stats">>;

/**
 * The profile's headline numbers, only the ones above zero. Reads-admin
 * stores 0 for experience nobody entered, which read as "0 yil"; a new
 * profile would say "0+" books. No count of language pairs: a bare "3" said
 * nothing about which, and the inquiry form lists them where they matter.
 */
export function getTranslatorStats(t: Translate, translator: Translator) {
  return [
    translator.totalBooksTranslated > 0 && {
      label: t("booksTranslated"),
      value: t("booksValue", { count: translator.totalBooksTranslated }),
    },
    translator.yearsActive > 0 && {
      label: t("yearsActive"),
      value: t("yearsValue", { years: translator.yearsActive }),
    },
  ].filter((stat) => stat !== false);
}
