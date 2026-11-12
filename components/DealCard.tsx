import Image from "next/image";
import { ArrowUpRight, Gift, Percent } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { formatDay } from "@/lib/announcements";
import { daysLeft, dealHref } from "@/lib/deals";
import type { Deal } from "@/lib/types";

/**
 * One discount or contest: who runs it, the headline, the percentage or
 * promo code, how long it has left, and one button to take it up. A white
 * plate like the catalogue's other cards; green only on what can be acted
 * on, as the design's one-accent rule asks.
 */
export async function DealCard({ deal, locale }: { deal: Deal; locale: string }) {
  const t = await getTranslations("deals");
  const left = daysLeft(deal);
  const href = dealHref(deal, locale);
  const Icon = deal.kind === "contest" ? Gift : Percent;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {deal.imageUrl ? (
        <div className="relative aspect-[16/9] w-full bg-stone-100">
          <Image src={deal.imageUrl} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-600">
            <Icon aria-hidden="true" className="h-3.5 w-3.5 text-zinc-500" />
            {t(deal.kind === "contest" ? "contest" : "discount")}
            {deal.source.name ? (
              <>
                <span aria-hidden="true" className="text-zinc-300">·</span>
                {deal.source.publisherSlug ? (
                  <Link href={`/publisher/${deal.source.publisherSlug}`} className="hover:text-forest-800">
                    {deal.source.name}
                  </Link>
                ) : (
                  deal.source.name
                )}
              </>
            ) : null}
          </span>
          {deal.discountPercent ? (
            <span className="rounded-full bg-forest-700 px-2.5 py-1 font-semibold tabular-nums text-white">
              {t("percentOff", { percent: deal.discountPercent })}
            </span>
          ) : null}
        </div>

        <h3 className="mt-3 font-serif text-lg leading-snug text-zinc-900">{deal.title}</h3>
        {deal.details ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-600 line-clamp-4">{deal.details}</p>
        ) : null}
        {deal.book ? (
          <p className="mt-2 text-sm">
            <Link href={`/book/${deal.book.id}`} className="text-forest-700 underline-offset-4 hover:underline">
              {t("book", { title: deal.book.title })}
            </Link>
          </p>
        ) : null}

        {deal.promoCode ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{t("promoCode")}</span>
            <code className="font-mono text-sm font-semibold tracking-wider text-zinc-900">{deal.promoCode}</code>
            <CopyLinkButton
              url={deal.promoCode}
              label={t("copyCode")}
              copiedLabel={t("copied")}
              icon="copy"
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:text-forest-800"
            />
          </div>
        ) : null}

        <div className="mt-auto pt-5">
          {left !== null ? (
            <p className={`text-xs ${left <= 2 ? "font-medium text-zinc-800" : "text-zinc-500"}`}>
              {left === 0
                ? t("lastDayToday")
                : `${t("lastDay", { date: formatDay(deal.endsOn!, locale) })} · ${t("daysLeft", { count: left })}`}
            </p>
          ) : null}
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener nofollow"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-800"
            >
              {t(deal.kind === "contest" ? "takeContest" : "takeDiscount")}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
