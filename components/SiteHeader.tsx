import { Send } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/Container";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { BrandMark } from "@/components/BrandMark";
import { SiteNav } from "@/components/SiteNav";
import { botHeaderUrl } from "@/lib/bot";

/**
 * The Kitoblarim lockup, as on the bot's landing page: the mark tile, the
 * name, and here a quiet word saying which part of Kitoblarim this is. Then
 * the catalogue's sections and the way to the bot.
 *
 * A phone's row is full, so there the quiet word goes, the bot link is its
 * icon alone, and the sections get a row of their own under the header. That
 * row isn't sticky: it scrolls away, leaving the reading space as it was and
 * anchors clear of the header.
 */
export async function SiteHeader({ subtitle }: { subtitle?: string }) {
  const t = await getTranslations("site");

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 backdrop-blur-md">
        <Container className="flex items-center justify-between gap-4 py-3.5">
          <Link href="/" className="group inline-flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg">
            <BrandMark size={32} className="shrink-0 transition-transform duration-300 ease-out group-hover:-rotate-3" />
            <span className="text-[1.125rem] font-bold tracking-[-0.025em] text-zinc-900">Kitoblarim</span>
            <span aria-hidden="true" className="hidden h-4 w-px bg-stone-300 sm:block" />
            <span className="hidden text-sm font-medium text-zinc-500 sm:inline">{t("brandSection")}</span>
          </Link>
          <SiteNav className="hidden min-w-0 flex-1 lg:ml-2 lg:flex" />
          <div className="flex shrink-0 items-center gap-1 text-sm text-zinc-600 sm:gap-4">
            {subtitle && (
              <span className="hidden text-xs font-medium text-zinc-500 sm:inline lg:hidden xl:inline">
                {subtitle}
              </span>
            )}
            <a
              href={botHeaderUrl()}
              target="_blank"
              rel="noopener"
              aria-label={t("botLinkLabel")}
              className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg font-medium text-forest-700 transition-colors duration-200 hover:bg-forest-100 sm:px-2"
            >
              <Send aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="hidden whitespace-nowrap sm:inline">{t("botLink")}</span>
            </a>
            <LocaleSwitcher />
          </div>
        </Container>
      </header>
      <div className="border-b border-stone-200 bg-stone-50 lg:hidden">
        <Container className="py-1">
          <SiteNav className="-mx-2.5 flex" />
        </Container>
      </div>
    </>
  );
}
