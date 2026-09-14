import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/Container";

export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="min-h-screen bg-stone-50">
      <Container className="flex min-h-screen flex-col items-center justify-center text-center">
        <p className="text-xs font-medium uppercase tracking-widest2 text-zinc-400">404</p>
        <h1 className="mt-3 font-serif text-2xl text-zinc-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-600">{t("body")}</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition-colors hover:bg-zinc-700">
          {t("home")}
        </Link>
      </Container>
    </div>
  );
}