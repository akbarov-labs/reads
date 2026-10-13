import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/Container";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { BrandMark } from "@/components/BrandMark";

/**
 * The Kitoblarim lockup, as on the bot's landing page: the mark tile, the
 * name, and here a quiet word saying which part of Kitoblarim this is.
 */
export async function SiteHeader({ subtitle }: { subtitle?: string }) {
  const t = await getTranslations("site");

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 backdrop-blur-md">
      <Container className="flex items-center justify-between gap-4 py-3.5">
        <Link href="/" className="group inline-flex min-w-0 items-center gap-2.5 rounded-lg">
          <BrandMark size={32} className="shrink-0 transition-transform duration-300 ease-out group-hover:-rotate-3" />
          <span className="text-[1.125rem] font-bold tracking-[-0.025em] text-zinc-900">Kitoblarim</span>
          <span aria-hidden="true" className="h-4 w-px bg-stone-300" />
          <span className="text-sm font-medium text-zinc-500">{t("brandSection")}</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-600">
          {subtitle && (
            <span className="hidden sm:inline text-xs font-medium text-zinc-500">
              {subtitle}
            </span>
          )}
          <LocaleSwitcher />
        </nav>
      </Container>
    </header>
  );
}
