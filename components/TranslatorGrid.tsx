import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { Translator } from "@/lib/types";

export async function TranslatorGrid({
  translators,
}: {
  translators: Translator[];
}) {
  const t = await getTranslations("translators");

  return (
    <section className="py-12 sm:py-16">
      <div className="flex items-baseline justify-between border-b border-zinc-200 pb-4">
        <h1 className="font-serif text-3xl text-zinc-900">{t("sectionTitle")}</h1>
        <span className="text-xs uppercase tracking-widest2 text-zinc-400">
          {t("count", { count: translators.length })}
        </span>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {translators.map((translator) => (
          <Link
            key={translator.slug}
            href={`/translator/${translator.slug}`}
            className="group flex gap-4 border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-zinc-100">
              <Image
                src={translator.avatarUrl}
                alt={translator.name}
                fill
                sizes="80px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0 self-center">
              <h2 className="font-serif text-xl text-zinc-900">{translator.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">{translator.title || t("defaultRole")}</p>
              <p className="mt-2 text-xs uppercase tracking-widest2 text-zinc-400">
                {t("books", { count: translator.books.length })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}