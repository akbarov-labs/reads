"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

/** The part of Cloudflare's window.turnstile this widget uses. */
interface Turnstile {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      language?: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<Turnstile> | null = null;

/** Loads Cloudflare's script once per page, only when a form is opened. */
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not load")));
    script.onerror = () => {
      loading = null;
      reject(new Error("Turnstile did not load"));
    };
    document.head.appendChild(script);
  });

  return loading;
}

export interface TurnstileHandle {
  /** A token is good for one check: ask for a fresh one after each send. */
  reset(): void;
}

/**
 * Cloudflare Turnstile's "are you a person" box. Hands the token up through
 * `onToken`, and null when it expires or the check fails, so the form knows
 * whether it can send. The token is verified server-side by
 * app/api/inquiries/[slug].
 */
export function TurnstileWidget({
  siteKey,
  action,
  language,
  onToken,
  onError,
  ref,
}: {
  siteKey: string;
  action: string;
  language?: string;
  onToken: (token: string | null) => void;
  onError: () => void;
  ref?: Ref<TurnstileHandle>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Latest callbacks without re-rendering the widget when they change.
  const callbacks = useRef({ onToken, onError });
  callbacks.current = { onToken, onError };

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
      callbacks.current.onToken(null);
    },
  }));

  useEffect(() => {
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !container.current) return;
        widgetId.current = turnstile.render(container.current, {
          sitekey: siteKey,
          action,
          language,
          callback: (token) => callbacks.current.onToken(token),
          "expired-callback": () => callbacks.current.onToken(null),
          "error-callback": () => {
            callbacks.current.onToken(null);
            callbacks.current.onError();
          },
        });
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onError();
      });

    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, action, language]);

  return <div ref={container} className="min-h-[65px]" />;
}
