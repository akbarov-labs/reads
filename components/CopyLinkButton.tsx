"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";

/** Deprecated, but it works where the Clipboard API is refused. */
function copyBySelection(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

/** Copies a page's address, and says so for a moment (to screen readers too). */
export function CopyLinkButton({
  url,
  label,
  copiedLabel,
  className = "",
}: {
  url: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  function copy() {
    // The selection copy first, while the click still counts as the
    // reader's own gesture: the Clipboard API is refused in some in-app
    // browsers (Telegram's on some phones), and a copy tried after its
    // refusal has already lost that gesture.
    if (copyBySelection(url)) {
      setCopied(true);
      return;
    }

    navigator.clipboard?.writeText(url).then(
      () => setCopied(true),
      // Nothing left to try; the address bar still has the link.
      () => {},
    );
  }

  const Icon = copied ? Check : Link2;

  return (
    <button type="button" onClick={copy} className={className}>
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
