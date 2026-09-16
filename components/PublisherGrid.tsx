import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Publisher } from "@/lib/types";

export async function PublisherGrid({ publishers }: { publishers: Publisher[] }) {
  const t = await getTranslations("publishers");

  return (
    <section className="border-t border-zinc-200 py-12 sm:py-16">
      <div className="flex items-baseline justify-between border-b border-zinc-200 pb-4">
        <h2 className="font-serif text-2xl text-zinc-900">{t("sectionTitle")}</h2>
        <span className="text-xs uppercase tracking-widest2 text-zinc-400">
          {t("count", { count: publishers.length })}
        </span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {publishers.map((publisher) => (
          <div key={publisher.id} className="flex items-center gap-4 border-b border-zinc-100 py-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-zinc-100">
              {publisher.logoUrl ? (
                <Image src={publisher.logoUrl} alt={publisher.name} fill sizes="48px" className="object-contain p-1" />
              ) : (
                <span className="flex h-full items-center justify-center font-serif text-lg text-zinc-400">
                  {publisher.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-lg text-zinc-800">{publisher.name}</h3>
              <p className="text-xs text-zinc-400">{t("books", { count: publisher.bookCount })}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}