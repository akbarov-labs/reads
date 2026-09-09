"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Container } from "@/components/Container";

// Shown when a page fails to render, which in practice means the
// Reads-admin API was unreachable. Deliberately offers a retry rather than
// pretending the site is simply empty.
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-50">
      <Container className="flex min-h-screen flex-col items-center justify-center text-center">
        <h1 className="font-serif text-2xl text-zinc-900 sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-600">
          {t("body")}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition-colors hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          {t("retry")}
        </button>
      </Container>
    </div>
  );
}
