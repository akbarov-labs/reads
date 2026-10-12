import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * What every share card (Open Graph image) draws with: Kitoblarim's colours,
 * Onest, and the mark. Satori needs .woff, not .woff2, and falls through the
 * font list per glyph, so Uzbek Latin (oʻ, gʻ) and Cyrillic both render.
 */
export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  paper: "#F6F7F4",
  ink: "#141A16",
  ink2: "#343A36",
  muted: "#5F6862",
  line: "#E1E5DF",
  forest: "#1F4D2E",
  sage: "#4A7D57",
} as const;

export const OG_FONT = "Onest, OnestExt, OnestCyr";
/** Titles and names, as the pages set them. */
export const OG_BOOK_FONT = "Literata, LiterataExt, LiterataCyr";

const FILES = [
  ["Onest", "latin"],
  ["OnestExt", "latin-ext"],
  ["OnestCyr", "cyrillic"],
] as const;
const WEIGHTS = [400, 600, 700] as const;

const BOOK_FILES = [
  ["Literata", "latin"],
  ["LiterataExt", "latin-ext"],
  ["LiterataCyr", "cyrillic"],
] as const;

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" };

async function font(file: string): Promise<ArrayBuffer> {
  // public/ ships with the standalone build, so this resolves both in
  // `next dev` and inside the production container.
  return (await readFile(path.join(process.cwd(), "public", "fonts", file))) as unknown as ArrayBuffer;
}

// Read once per process: these files never change.
let fontsPromise: Promise<OgFont[]> | null = null;

export function loadOgFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all([
    ...FILES.flatMap(([name, subset]) =>
      WEIGHTS.map(async (weight) => ({
        name,
        data: await font(`onest-${subset}-${weight}-normal.woff`),
        weight,
        style: "normal" as const,
      })),
    ),
    ...BOOK_FILES.map(async ([name, subset]) => ({
      name,
      data: await font(`literata-${subset}-600-normal.woff`),
      weight: 600 as const,
      style: "normal" as const,
    })),
  ]);
  return fontsPromise;
}

/** The mark tile and the name, as in the site header, at share-card size. */
export function OgLockup({ section }: { section: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <svg width="64" height="64" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="22.5" fill={OG.forest} />
        <g transform="translate(50 50) scale(.62) translate(-50 -50)">
          <path
            d="M18.25 14H33.75A1.25 1.25 0 0 1 33.75 16.5H18.25A3.25 3.25 0 0 0 18.25 23H34Q35 23 35 24V85Q35 86 34 86H17.5A5 5 0 0 1 12.5 81V19.75A5.75 5.75 0 0 1 18.25 14Z"
            fill={OG.paper}
          />
          <path d="M37.5 41.5L63.9 15.1Q65 14 66.6 14H87.5L37.5 64Z" fill={OG.paper} />
          <path d="M41.5 64L53.5 52L87.5 86H65.5L52 72.5V86L46.75 81.5L41.5 86Z" fill={OG.sage} />
        </g>
      </svg>
      <div style={{ marginLeft: 20, fontSize: 36, fontWeight: 700, letterSpacing: -1, color: OG.ink }}>
        Kitoblarim
      </div>
      <div style={{ marginLeft: 18, width: 2, height: 30, backgroundColor: OG.line }} />
      <div style={{ marginLeft: 18, fontSize: 30, color: OG.muted }}>{section}</div>
    </div>
  );
}
