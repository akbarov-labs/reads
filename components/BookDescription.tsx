"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/** Longer than this, or on more lines, a description opens collapsed. */
const LONG_CHARACTERS = 600;
const LONG_LINES = 8;

export function isLongDescription(text: string): boolean {
  return text.length > LONG_CHARACTERS || text.split("\n").length > LONG_LINES;
}

/**
 * A book's description, its paragraphs and list lines kept. A long one
 * shows its first few lines until the reader asks for the rest. Only CSS
 * hides it, so the whole text is in the page for search engines either way.
 */
export function BookDescription({
  text,
  moreLabel,
  lessLabel,
}: {
  text: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const id = useId();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const long = isLongDescription(text);

  function toggle() {
    setOpen(!open);
    // Folding a long text back up leaves the reader far below it.
    if (open && textRef.current && textRef.current.getBoundingClientRect().top < 0) {
      textRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  return (
    <div className="mt-6">
      <p
        id={id}
        ref={textRef}
        className={`text-sm leading-relaxed text-zinc-700 whitespace-pre-line ${
          long && !open ? "max-h-[6lh] overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]" : ""
        }`}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={id}
          className="mt-2 inline-flex items-center gap-1 rounded text-sm font-medium text-forest-800 hover:text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
        >
          {open ? lessLabel : moreLabel}
          <ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
