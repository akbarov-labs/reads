import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, AudioLines, CalendarCheck, Library, ScanBarcode, Send, Trophy, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { localeAlternates, type Locale } from "@/lib/site";
import { botPageUrl } from "@/lib/bot";
import { botPageGraph } from "@/lib/jsonld";
import { SiteHeader } from "@/components/SiteHeader";
import { Container } from "@/components/Container";
import { BrandMark } from "@/components/BrandMark";
import { JsonLd } from "@/components/JsonLd";

type Pain = { pain: string; fix: string };
type Step = { title: string; body: string };
type Faq = { q: string; a: string };
type Mock = Record<"label" | "now" | "book" | "author" | "progress" | "today" | "bot" | "message" | "time" | "button1" | "button2", string>;

/** One icon per feature, in the order of botPage.features. */
const FEATURE_ICONS = [Library, ScanBarcode, AudioLines, Trophy, Users, CalendarCheck];

/** How far the sample reader is: 186 of 544 pages. */
const MOCK_PROGRESS = 186 / 544;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "botPage" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: localeAlternates(locale as Locale, "/bot"),
  };
}

/**
 * What the Kitoblarim bot is for, told as the reader's problems and the
 * bot's answer to each. It replaces the bot's own landing page: readers
 * arrive here, on the catalogue, so this is where they learn about it.
 */
export default async function BotPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("botPage");
  const tSite = await getTranslations("site");

  const pains = t.raw("pains") as Pain[];
  const steps = t.raw("steps") as Step[];
  const features = t.raw("features") as Step[];
  const faq = t.raw("faq") as Faq[];
  const facts = t.raw("facts") as string[];
  const mock = t.raw("mock") as Mock;
  const href = botPageUrl();

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <JsonLd
        data={botPageGraph({
          locale: locale as Locale,
          path: "/bot",
          name: t("pageTitle"),
          description: t("pageDescription"),
          botUrl: href,
          faq,
          steps,
          trail: [
            { name: tSite("homeTitle"), path: "" },
            { name: t("breadcrumb"), path: "/bot" },
          ],
        })}
      />
      <SiteHeader />

      <main className="flex-1">
        {/* ─── HERO: the pain in the headline, the answer below it ─── */}
        <section className="border-b border-stone-200">
          <Container className="py-16 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
              <div className="lg:col-span-7">
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-zinc-900 leading-[1.1] tracking-tight whitespace-pre-line">
                  {t("heroHeadline")}
                </h1>
                <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-zinc-500">{t("heroSubline")}</p>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                  <BotButton href={href} label={t("cta")} />
                  <a
                    href="#how"
                    className="group inline-flex items-center gap-1 text-sm font-medium text-forest-700 transition-colors hover:text-forest-800"
                  >
                    {t("how")}
                    <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                  </a>
                </div>
                <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
                  {facts.map((fact) => (
                    <li key={fact} className="flex items-center gap-2">
                      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-stone-300" />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5">
                <ReminderMock mock={mock} />
              </div>
            </div>
          </Container>
        </section>

        {/* ─── PAINS, each with the bot's answer ─── */}
        <section className="border-b border-stone-200 bg-white" aria-labelledby="pains">
          <Container className="py-16 sm:py-20">
            <SectionTitle id="pains" title={t("painsTitle")} lead={t("painsLead")} />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pains.map((item) => (
                <li key={item.pain} className="rounded-2xl border border-stone-200 bg-stone-50/80 p-6">
                  <p className="font-serif text-lg leading-snug text-zinc-900">{item.pain}</p>
                  <p className="mt-4 flex gap-2.5 text-sm leading-relaxed text-zinc-700">
                    <ArrowRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-forest-700" />
                    <span>{item.fix}</span>
                  </p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* ─── HOW IT WORKS: three steps and a worked example ─── */}
        <section id="how" className="scroll-mt-20 border-b border-stone-200" aria-labelledby="steps">
          <Container className="py-16 sm:py-20">
            <SectionTitle id="steps" title={t("stepsTitle")} />
            <ol className="grid gap-8 sm:grid-cols-3 sm:gap-6">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-forest-200 bg-forest-50 font-serif text-lg tabular-nums text-forest-900">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-serif text-lg text-zinc-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-10 max-w-3xl rounded-2xl border border-stone-200 bg-white px-6 py-5 font-serif text-[1.0625rem] leading-relaxed text-zinc-800">
              {t("example")}
            </p>
          </Container>
        </section>

        {/* ─── EVERYTHING ELSE the bot does ─── */}
        <section className="border-b border-stone-200 bg-white" aria-labelledby="features">
          <Container className="py-16 sm:py-20">
            <SectionTitle id="features" title={t("featuresTitle")} />
            <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = FEATURE_ICONS[index] ?? Library;
                return (
                  <li key={feature.title}>
                    <Icon aria-hidden="true" className="h-5 w-5 text-zinc-500" />
                    <h3 className="mt-3 font-serif text-lg text-zinc-900">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{feature.body}</p>
                  </li>
                );
              })}
            </ul>
          </Container>
        </section>

        {/* ─── THE CATALOGUE and the bot are one product ─── */}
        <section className="border-b border-stone-200" aria-labelledby="catalogue">
          <Container className="py-16 sm:py-20">
            <div className="max-w-3xl">
              <h2 id="catalogue" className="font-serif text-2xl sm:text-3xl text-zinc-900 tracking-tight">
                {t("catalogueTitle")}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">{t("catalogueBody")}</p>
              <Link
                href="/books"
                className="group mt-5 inline-flex items-center gap-1 text-sm font-medium text-forest-700 transition-colors hover:text-forest-800"
              >
                {t("catalogueLink")}
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Container>
        </section>

        {/* ─── QUESTIONS, also given to search engines as FAQPage ─── */}
        <section className="border-b border-stone-200 bg-white" aria-labelledby="faq">
          <Container className="py-16 sm:py-20">
            <SectionTitle id="faq" title={t("faqTitle")} />
            <div className="-mt-5 max-w-3xl divide-y divide-stone-200 border-b border-stone-200">
              {faq.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-serif text-lg text-zinc-900 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span
                      aria-hidden="true"
                      className="mt-1 text-xl leading-none text-zinc-400 transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-700">{item.a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        {/* ─── START ─── */}
        <section>
          <Container className="py-16 sm:py-24 text-center">
            <BrandMark size={48} className="mx-auto" />
            <h2 className="mt-6 font-serif text-3xl sm:text-4xl text-zinc-900 tracking-tight">{t("finalTitle")}</h2>
            <p className="mt-3 text-base text-zinc-500">{t("finalBody")}</p>
            <div className="mt-8 flex justify-center">
              <BotButton href={href} label={t("cta")} />
            </div>
            <p className="mt-4 text-xs text-zinc-400">@kitob_javonim_bot</p>
          </Container>
        </section>
      </main>
    </div>
  );
}

function SectionTitle({ id, title, lead }: { id: string; title: string; lead?: string }) {
  return (
    <div className="mb-10 border-b border-stone-200 pb-5">
      <h2 id={id} className="font-serif text-2xl sm:text-3xl text-zinc-900 tracking-tight">
        {title}
      </h2>
      {lead ? <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-600">{lead}</p> : null}
    </div>
  );
}

/** The page's one filled button, opening the bot. */
function BotButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2 rounded-lg bg-forest-700 px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-forest-800"
    >
      <Send aria-hidden="true" className="h-4 w-4" />
      {label}
    </a>
  );
}

/**
 * What the bot looks like on a reading day: the book in progress, then the
 * evening reminder with its two buttons. A picture of the chat, not a
 * control, so its buttons are plain text.
 */
function ReminderMock({ mock }: { mock: Mock }) {
  return (
    <figure aria-label={mock.label} className="mx-auto max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        <div className="flex aspect-[2/3] w-16 shrink-0 items-center justify-center rounded-sm bg-forest-700 p-1.5 text-center font-serif text-[10px] leading-tight text-stone-50 shadow-sm ring-1 ring-stone-200">
          {mock.book}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{mock.now}</p>
          <p className="mt-1 font-serif text-lg leading-snug text-zinc-900">{mock.book}</p>
          <p className="text-xs text-zinc-500">{mock.author}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-forest-400" style={{ width: `${Math.round(MOCK_PROGRESS * 100)}%` }} />
          </div>
          <p className="mt-1.5 flex justify-between text-xs tabular-nums text-zinc-500">
            <span>{mock.progress}</span>
            <span>{mock.today}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-stone-50 p-3">
        <div className="flex items-start gap-2.5">
          <BrandMark size={28} className="shrink-0" />
          <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border border-stone-200 bg-white px-3 py-2">
            <p className="text-xs font-semibold text-forest-700">{mock.bot}</p>
            <p className="mt-0.5 text-sm leading-snug text-zinc-800">{mock.message}</p>
            <p className="mt-1 text-right text-[10px] tabular-nums text-zinc-400">{mock.time}</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 pl-[38px]">
          <span className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-center text-xs font-medium text-zinc-700">
            {mock.button1}
          </span>
          <span className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-center text-xs font-medium text-zinc-700">
            {mock.button2}
          </span>
        </div>
      </div>
    </figure>
  );
}
