import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/Container";
import { botUrl } from "@/lib/bot";

/**
 * On every page: a quote, one quiet line about the Telegram bot, the
 * libraries list, the copyright. Libraries move into the header once there
 * are enough of them to be worth a reader's first look.
 */
export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tLibraries = await getTranslations("libraries");

  return (
    <footer className="border-t border-stone-200 py-10 text-center text-xs text-zinc-400 bg-stone-50">
      <Container>
        <p className="font-serif italic text-sm text-zinc-600 mb-1">«{t("quote")}»</p>
        <p className="mb-1">
          {t("botLead")}{" "}
          <a
            href={botUrl()}
            target="_blank"
            rel="noopener"
            className="underline underline-offset-4 decoration-stone-300 hover:text-forest-800 hover:decoration-forest-800 transition-colors"
          >
            {t("botName")}
          </a>
        </p>
        <p className="mb-1">
          <Link
            href="/libraries"
            className="underline underline-offset-4 decoration-stone-300 hover:text-forest-800 hover:decoration-forest-800 transition-colors"
          >
            {tLibraries("footerLink")}
          </Link>
        </p>
        <p>© {new Date().getFullYear()} Kitoblarim</p>
      </Container>
    </footer>
  );
}
