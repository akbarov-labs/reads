"use client";

import { useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import type { LanguagePair } from "@/lib/types";
import { TurnstileWidget, type TurnstileHandle } from "@/components/TurnstileWidget";

const PROJECT_TYPE_VALUES = [
  "book",
  "article",
  "certified_document",
  "interpretation",
  "other",
] as const;

const BUDGET_RANGE_VALUES = [
  "under_100",
  "100_500",
  "500_1000",
  "over_1000",
  "not_sure",
] as const;

type FieldErrors = Record<string, string[]>;

function pairKey(pair: LanguagePair) {
  return `${pair.from}→${pair.to}`;
}

export function InquiryForm({
  slug,
  languagePairs,
  turnstileSiteKey,
}: {
  slug: string;
  languagePairs: LanguagePair[];
  /** Null where Turnstile is not set up (local, staging): no check shown. */
  turnstileSiteKey: string | null;
}) {
  const t = useTranslations("inquiry");
  const locale = useLocale();
  const formId = useId();
  const turnstile = useRef<TurnstileHandle>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle"
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setFormError(null);
    setFieldErrors({});

    const data = new FormData(event.currentTarget);

    // Honeypot: a real visitor never sees or fills this field. If it's
    // filled, pretend everything went fine, no point tipping off a bot.
    if (String(data.get("website") ?? "").trim() !== "") {
      setStatus("success");
      return;
    }

    if (turnstileSiteKey && !captchaToken) {
      setFormError(t("captchaRequired"));
      setStatus("idle");
      return;
    }

    const [from, to] = String(data.get("pair") ?? "").split("→");

    const payload = {
      name: data.get("name"),
      email: data.get("email"),
      from_language: from,
      to_language: to,
      project_type: data.get("project_type"),
      word_count: data.get("word_count") || null,
      budget_range: data.get("budget_range") || null,
      deadline: data.get("deadline") || null,
      message: data.get("message"),
      website: data.get("website"),
    };

    try {
      // Same origin: app/api/inquiries/[slug] forwards it to Reads-admin,
      // so the browser never needs the admin's address.
      const response = await fetch(
        `/api/inquiries/${encodeURIComponent(slug)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(captchaToken ? { "X-Turnstile-Token": captchaToken } : {}),
          },
          body: JSON.stringify(payload),
        }
      );

      // The server spent the token checking it, whatever came of the rest;
      // a second try needs a new one.
      turnstile.current?.reset();

      if (response.status === 201) {
        setStatus("success");
        return;
      }

      if (response.status === 422) {
        const body = await response.json();
        setFieldErrors(body.errors ?? {});
        setFormError(t("fixFields"));
        setStatus("idle");
        return;
      }

      if (response.status === 403) {
        setFormError(t("captchaFailed"));
        setStatus("idle");
        return;
      }

      if (response.status === 429) {
        setFormError(t("tooMany"));
        setStatus("idle");
        return;
      }

      throw new Error(`Unexpected response: ${response.status}`);
    } catch {
      setFormError(t("genericError"));
      setStatus("idle");
    }
  }

  if (!open && status !== "success") {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition-colors hover:bg-zinc-700"
      >
        <Send className="h-4 w-4" />
        {t("cta")}
      </button>
    );
  }

  if (status === "success") {
    return (
      <div className="w-full rounded-lg border border-forest-200 bg-forest-50 p-5 text-sm text-forest-900">
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("successTitle")}
        </p>
        <p className="mt-1 text-forest-800">{t("successBody")}</p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setOpen(false);
          }}
          className="mt-3 text-sm font-medium text-forest-900 underline underline-offset-2 hover:text-forest-700"
        >
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  const inputClasses =
    "w-full min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-forest-700 focus:outline-none focus:ring-2 focus:ring-forest-700/15";
  const labelClasses = "block text-sm font-medium text-zinc-700";

  function fieldError(name: string) {
    return fieldErrors[name]?.[0];
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl rounded-lg border border-zinc-200 bg-white p-5 sm:p-6"
      noValidate
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg text-zinc-900">{t("formTitle")}</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          {t("cancel")}
        </button>
      </div>

      {formError && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {formError}
        </p>
      )}

      {/* Honeypot, visually hidden (sr-only pattern, no off-canvas offset
          that could blow out the page's scroll area) and removed from the
          accessibility tree and tab order entirely. */}
      <div className="sr-only" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-name`} className={labelClasses}>
            {t("labelName")}
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            required
            className={inputClasses}
            aria-describedby={fieldError("name") ? `${formId}-name-error` : undefined}
          />
          {fieldError("name") && (
            <p id={`${formId}-name-error`} className="mt-1 text-xs text-red-600">
              {fieldError("name")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${formId}-email`} className={labelClasses}>
            {t("labelEmail")}
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            required
            className={inputClasses}
            aria-describedby={fieldError("email") ? `${formId}-email-error` : undefined}
          />
          {fieldError("email") && (
            <p id={`${formId}-email-error`} className="mt-1 text-xs text-red-600">
              {fieldError("email")}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${formId}-pair`} className={labelClasses}>
            {t("labelPair")}
          </label>
          <select
            id={`${formId}-pair`}
            name="pair"
            required
            defaultValue=""
            className={inputClasses}
            aria-describedby={
              fieldError("to_language") ? `${formId}-pair-error` : undefined
            }
          >
            <option value="" disabled>
              {t("choosePair")}
            </option>
            {languagePairs.map((pair) => (
              <option key={pairKey(pair)} value={pairKey(pair)}>
                {pair.from} → {pair.to}
              </option>
            ))}
          </select>
          {fieldError("to_language") && (
            <p id={`${formId}-pair-error`} className="mt-1 text-xs text-red-600">
              {t("pairMismatch")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${formId}-project_type`} className={labelClasses}>
            {t("labelProjectType")}
          </label>
          <select
            id={`${formId}-project_type`}
            name="project_type"
            required
            defaultValue=""
            className={inputClasses}
          >
            <option value="" disabled>
              {t("chooseProjectType")}
            </option>
            {PROJECT_TYPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`projectType.${value}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${formId}-word_count`} className={labelClasses}>
            {t("labelWordCount")}{" "}
            <span className="font-normal text-zinc-400">{t("optional")}</span>
          </label>
          <input
            id={`${formId}-word_count`}
            name="word_count"
            type="number"
            min={1}
            inputMode="numeric"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor={`${formId}-budget_range`} className={labelClasses}>
            {t("labelBudget")}{" "}
            <span className="font-normal text-zinc-400">{t("optional")}</span>
          </label>
          <select
            id={`${formId}-budget_range`}
            name="budget_range"
            defaultValue=""
            className={inputClasses}
          >
            <option value="">{t("budget.unspecified")}</option>
            {BUDGET_RANGE_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`budget.${value}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${formId}-deadline`} className={labelClasses}>
            {t("labelDeadline")}{" "}
            <span className="font-normal text-zinc-400">{t("optional")}</span>
          </label>
          <input
            id={`${formId}-deadline`}
            name="deadline"
            type="date"
            className={inputClasses}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={`${formId}-message`} className={labelClasses}>
            {t("labelMessage")}
          </label>
          <textarea
            id={`${formId}-message`}
            name="message"
            required
            minLength={10}
            rows={4}
            className={inputClasses}
            aria-describedby={
              fieldError("message") ? `${formId}-message-error` : undefined
            }
          />
          {fieldError("message") && (
            <p id={`${formId}-message-error`} className="mt-1 text-xs text-red-600">
              {fieldError("message")}
            </p>
          )}
        </div>
      </div>

      {turnstileSiteKey && (
        <div className="mt-5">
          <TurnstileWidget
            ref={turnstile}
            siteKey={turnstileSiteKey}
            action="inquiry"
            // Cloudflare has no Uzbek; "auto" follows the browser.
            language={locale === "uz" ? "auto" : locale}
            onToken={setCaptchaToken}
            onError={() => setFormError(t("captchaFailed"))}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === "submitting" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {t("submit")}
      </button>
    </form>
  );
}
