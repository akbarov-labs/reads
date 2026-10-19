import { getLocale, getTranslations } from "next-intl/server";
import { Send } from "lucide-react";
import { absoluteUrl, type Locale } from "@/lib/site";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { telegramShareUrl } from "@/lib/share";

/**
 * Passing a page on, the way readers here do: to a Telegram chat, or as a
 * copied link. The Telegram link works without JavaScript; copying needs it.
 */
export async function ShareLinks({
  path,
  text,
  size = "md",
  className = "",
}: {
  /** The page's path without the locale, e.g. "/book/18". */
  path: string;
  /** What the Telegram message says above the link. */
  text: string;
  /** "sm" sits in a card's footer, beside "read more". */
  size?: "sm" | "md";
  className?: string;
}) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("share")]);
  const url = absoluteUrl(locale as Locale, path);
  const item =
    size === "sm"
      ? "inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-forest-800 transition-colors"
      : "inline-flex items-center gap-2 rounded-xl py-2 pl-2 pr-3 text-sm text-zinc-600 transition-colors duration-200 hover:bg-forest-100 hover:text-forest-800";

  return (
    <div className={`flex flex-wrap items-center ${size === "sm" ? "gap-4" : "gap-1"} ${className}`}>
      <a href={telegramShareUrl(url, text)} target="_blank" rel="noopener" className={item}>
        <Send aria-hidden="true" className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4 shrink-0"} />
        <span>{t("telegram")}</span>
      </a>
      <CopyLinkButton url={url} label={t("copy")} copiedLabel={t("copied")} className={item} />
    </div>
  );
}
