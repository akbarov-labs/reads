import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/400-italic.css";
import "../globals.css";
import { routing } from "@/i18n/routing";
import {
  OG_LOCALE,
  SITE_NAME,
  SITE_URL,
  localeAlternates,
  type Locale,
} from "@/lib/site";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#fafaf9",
  colorScheme: "light",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  const typedLocale = locale as Locale;

  return {
    // Everything relative in this file and in child pages resolves against
    // this. Without it, og:image and canonical come out as bare paths,
    // which crawlers cannot follow.
    metadataBase: new URL(SITE_URL),
    // Child pages set their own title; this template frames it, and the
    // default covers pages that set none.
    title: {
      default: t("homeTitle"),
      template: `%s · ${SITE_NAME}`,
    },
    description: t("homeDescription"),
    applicationName: SITE_NAME,
    alternates: localeAlternates(typedLocale),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: t("homeTitle"),
      description: t("homeDescription"),
      locale: OG_LOCALE[typedLocale],
    },
    twitter: { card: "summary_large_image" },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    // Turns off iOS Safari's habit of linkifying anything that resembles a
    // phone number — book years and word counts get caught by it.
    formatDetection: { telephone: false, address: false, email: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Renders in Server Components too, but client components in the tree
  // (InquiryForm, ExcerptReader) need this provider to call useTranslations.
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className="bg-stone-50 font-sans text-zinc-900 antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
