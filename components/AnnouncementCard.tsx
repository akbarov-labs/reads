import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDay, formatSum } from "@/lib/announcements";
import { orderRedirectPath } from "@/lib/order";
import type { Announcement } from "@/lib/types";

/**
 * One publisher's new book or pre-order. The order button goes through
 * /go/order (counted, then the publisher's Telegram with the message
 * typed); a plain link, so it works without JavaScript.
 */
export async function AnnouncementCard({
  announcement,
  locale,
  showPublisher = true,
}: {
  announcement: Announcement;
  locale: string;
  showPublisher?: boolean;
}) {
  const t = await getTranslations("announcements");
  const tCard = await getTranslations("bookCard");

  const price = announcement.price !== null ? t("price", { price: formatSum(announcement.price, locale) }) : null;
  const preorderPrice = announcement.preorderPrice !== null ? t("price", { price: formatSum(announcement.preorderPrice, locale) }) : null;
  const byline = [announcement.author, announcement.translator ? t("translatedBy", { name: announcement.translator }) : null]
    .filter(Boolean)
    .join(" · ");

  const title = announcement.bookId ? (
    <Link href={`/book/${announcement.bookId}`} className="hover:text-forest-800 hover:underline underline-offset-4">
      {announcement.title}
    </Link>
  ) : (
    announcement.title
  );

  return (
    <article className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4">
      <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-sm bg-zinc-100 shadow-sm ring-1 ring-zinc-200 sm:w-28">
        {announcement.coverUrl ? (
          <Image
            src={announcement.coverUrl}
            alt={tCard("coverAlt", { title: announcement.title })}
            fill
            sizes="112px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-2 text-center font-serif text-xs text-stone-400">
            {announcement.title}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={`self-start rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            announcement.isPreorder
              ? "border-forest-300 bg-forest-50 text-forest-800"
              : "border-stone-300 bg-stone-50 text-zinc-600"
          }`}
        >
          {announcement.isPreorder ? t("preorder") : t("newBook")}
        </span>

        <h3 className="mt-2 font-serif text-lg leading-snug text-zinc-900">{title}</h3>
        {byline && <p className="mt-0.5 text-sm text-zinc-500">{byline}</p>}
        {showPublisher && (
          <p className="mt-1 text-xs uppercase tracking-widest2 text-zinc-400">
            <Link href={`/publisher/${announcement.publisher.slug}`} className="hover:text-forest-800">
              {announcement.publisher.name}
            </Link>
          </p>
        )}

        {(preorderPrice || price) && (
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm">
            {preorderPrice ? (
              <>
                <span className="font-semibold text-zinc-900">{preorderPrice}</span>
                {price && <s className="text-zinc-400">{price}</s>}
              </>
            ) : (
              <span className="font-semibold text-zinc-900">{price}</span>
            )}
          </p>
        )}
        {announcement.preorderDeadline && (
          <p className="mt-0.5 text-xs text-zinc-500">{t("lastDay", { date: formatDay(announcement.preorderDeadline, locale) })}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
          {/* A plain <a> to the counting redirect, not next/link: a
              prefetch would not be an order. */}
          <a
            href={orderRedirectPath(announcement.id, locale)}
            target="_blank"
            rel="nofollow noopener"
            title={t("orderNote")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-800"
          >
            <MessageCircle aria-hidden="true" className="h-4 w-4" />
            {t("order")}
          </a>
          <a
            href={announcement.sourceUrl}
            target="_blank"
            rel="nofollow noopener"
            className="text-xs text-zinc-500 underline-offset-4 hover:text-forest-800 hover:underline"
          >
            {t("viewPost")}
          </a>
        </div>
      </div>
    </article>
  );
}
