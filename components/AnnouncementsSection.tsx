import { getTranslations } from "next-intl/server";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { stillOpen } from "@/lib/announcements";
import type { Announcement } from "@/lib/types";

/**
 * "New books and pre-orders": publishers' announcements, on the home page
 * and on a publisher's own page. Renders nothing when there are none.
 */
export async function AnnouncementsSection({
  announcements,
  locale,
  showPublisher = true,
  className = "",
}: {
  announcements: Announcement[];
  locale: string;
  showPublisher?: boolean;
  className?: string;
}) {
  const open = stillOpen(announcements);
  if (open.length === 0) return null;

  const t = await getTranslations("announcements");

  return (
    <section className={className} aria-labelledby="announcements">
      <div className="mb-8 border-b border-stone-200 pb-4">
        <h2 id="announcements" className="font-serif text-2xl tracking-tight text-zinc-900 sm:text-3xl">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">{t("lead")}</p>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {open.map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} locale={locale} showPublisher={showPublisher} />
        ))}
      </div>
    </section>
  );
}
