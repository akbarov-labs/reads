"use client";

import { useEffect, useRef } from "react";
import { sendNote } from "@/lib/note";

/**
 * Tells the site's statistics that this book page was opened. From the
 * browser, after the page has loaded, because the page itself is cached
 * and its render does not happen once per reader; and most crawlers never
 * run it. Renders nothing.
 */
export function BookViewBeacon({ bookId, locale }: { bookId: string; locale: string }) {
  // Effects run twice in development's Strict Mode; one page is one view.
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (sent.current === bookId) return;
    sent.current = bookId;
    sendNote({ type: "view", bookId, locale });
  }, [bookId, locale]);

  return null;
}
