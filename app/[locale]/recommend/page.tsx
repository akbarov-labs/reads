import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getCategories,
  getRecommendations,
  RECOMMEND_LENGTHS,
  RECOMMEND_PICKS,
  type RecommendAnswers,
} from "@/lib/api";
import { localeAlternates, type Locale } from "@/lib/site";
import type { Category } from "@/lib/types";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { BookCard } from "@/components/BookCard";

/** Reads searchParams: see the note on the books listing. */
export const dynamic = "force-dynamic";

type Params = { genre?: string; length?: string; pick?: string; page?: string };

/**
 * "Badiiy adabiyot" is half the catalogue, so the quiz offers its parts
 * (world, Uzbek, Turkish) instead. Gift sets and collectors' editions are
 * kinds of printing, not something to read.
 */
const SPLIT_INTO_CHILDREN = new Set(["badiiy-adabiyot"]);
const NOT_A_GENRE = new Set(["sovga-toplamlari", "kolleksionerlar-uchun"]);
/** Fewer books than this, and "show others" would run dry at once. */
const FEWEST_BOOKS = 20;

function quizGenres(categories: Category[]): Category[] {
  return categories
    .flatMap((c) => (SPLIT_INTO_CHILDREN.has(c.slug) && c.children.length > 0 ? c.children : [c]))
    .filter((c) => !NOT_A_GENRE.has(c.slug) && c.bookCount >= FEWEST_BOOKS);
}

/** Only answers the quiz offers go to the API; anything else is "any". */
function readAnswers(params: Params, genres: Category[]): RecommendAnswers {
  const pick = RECOMMEND_PICKS.find((p) => p === params.pick);
  const length = RECOMMEND_LENGTHS.find((l) => l === params.length);
  const genre = genres.some((g) => g.slug === params.genre) ? params.genre : undefined;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  return { genre, length, pick, page };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const answered = Object.keys(await searchParams).length > 0;
  const t = await getTranslations({ locale, namespace: "recommend" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: localeAlternates(locale as Locale, "/recommend"),
    // The quiz is the page; every combination of answers is not another one.
    ...(answered ? { robots: { index: false, follow: true } } : {}),
  };
}

function Choice({
  name,
  value,
  label,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="cursor-pointer rounded-full border border-stone-300 bg-white px-3.5 py-2 text-sm text-zinc-700 transition-colors duration-200 hover:border-forest-400 has-[:checked]:border-forest-700 has-[:checked]:bg-forest-700 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-forest-400 has-[:focus-visible]:ring-offset-2">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="sr-only" />
      {label}
    </label>
  );
}

export default async function RecommendPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Params>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const [categories, t] = await Promise.all([getCategories(locale), getTranslations("recommend")]);
  const genres = quizGenres(categories);
  const answers = readAnswers(query, genres);

  // The form always sends `pick`, so its presence means the reader asked.
  const asked = query.pick !== undefined || query.genre !== undefined || query.length !== undefined;
  const results = asked ? await getRecommendations(locale, answers) : null;

  const pick = answers.pick ?? "popular";
  const nextPage = results && results.page < results.lastPage ? results.page + 1 : 1;
  const others = new URLSearchParams({
    ...(answers.genre ? { genre: answers.genre } : {}),
    ...(answers.length ? { length: answers.length } : {}),
    pick,
    ...(nextPage > 1 ? { page: String(nextPage) } : {}),
  });

  const legend = "mb-3 text-xs font-medium uppercase tracking-widest2 text-zinc-400";

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-12 sm:py-16">
          <div className="max-w-3xl">
            <h1 className="font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight">{t("heading")}</h1>
            <p className="mt-2 text-sm text-zinc-500">{t("pageDescription")}</p>
          </div>

          {/* A plain GET form: it works before (and without) JavaScript, and
              the answers stay in the URL, so a result can be shared. */}
          <form action="#results" className="mt-10 max-w-3xl space-y-8">
            <fieldset>
              <legend className={legend}>{t("genre")}</legend>
              <div className="flex flex-wrap gap-2">
                <Choice name="genre" value="" label={t("any")} checked={!answers.genre} />
                {genres.map((g) => (
                  <Choice key={g.slug} name="genre" value={g.slug} label={g.name} checked={answers.genre === g.slug} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={legend}>{t("length")}</legend>
              <div className="flex flex-wrap gap-2">
                <Choice name="length" value="" label={t("any")} checked={!answers.length} />
                {RECOMMEND_LENGTHS.map((l) => (
                  <Choice key={l} name="length" value={l} label={t(l)} checked={answers.length === l} />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={legend}>{t("pick")}</legend>
              <div className="flex flex-wrap gap-2">
                {RECOMMEND_PICKS.map((p) => (
                  <Choice key={p} name="pick" value={p} label={t(p)} checked={pick === p} />
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-lg bg-forest-700 px-6 text-sm font-medium text-white transition-colors duration-200 hover:bg-forest-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-400 focus-visible:ring-offset-2"
            >
              {t("submit")}
            </button>
          </form>

          {results && (
            <section id="results" className="mt-14 scroll-mt-24 border-t border-stone-200 pt-10">
              <h2 className="font-serif text-2xl text-zinc-900">{t("resultsTitle")}</h2>
              {results.items.length > 0 ? (
                <>
                  <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4">
                    {results.items.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                  <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                    {results.lastPage > 1 && (
                      <Link
                        href={`/recommend?${others}#results`}
                        className="inline-flex min-h-11 items-center rounded-lg border border-forest-700 px-5 text-sm font-medium text-forest-800 transition-colors duration-200 hover:bg-forest-100"
                      >
                        {t("more")}
                      </Link>
                    )}
                    <Link href="/recommend" className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline">
                      {t("reset")}
                    </Link>
                  </div>
                  {pick === "popular" && <p className="mt-6 text-xs text-zinc-400">{t("howRanked")}</p>}
                </>
              ) : (
                <p className="mt-6 text-sm text-zinc-500">{t("empty")}</p>
              )}
            </section>
          )}
        </Container>
      </main>
    </div>
  );
}
