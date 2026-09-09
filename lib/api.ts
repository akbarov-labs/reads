import type { Translator } from "@/lib/types";

// Server-only: read directly, never exposed to the browser bundle.
// Points at the Reads-admin Laravel API (see Reads-admin/README or the
// root README for how the two projects run together locally).
const API_URL = process.env.API_URL ?? "http://localhost:8000/api";

// The API returns image paths relative to its own origin (e.g.
// "/storage/avatars/x.jpg") rather than baking in an absolute URL, because
// it can't know which host name we used to reach it — a browser and a
// server-side fetch from inside Docker resolve "localhost" differently.
// We resolve against the same origin we used for API_URL.
const ASSET_BASE_URL = API_URL.replace(/\/api\/?$/, "");

function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${ASSET_BASE_URL}${path}`;
}

// Revalidate portfolio data periodically instead of on every request or
// only at build time — translators edit their profile through the admin
// dashboard and expect changes to show up without a redeploy.
const REVALIDATE_SECONDS = 60;

interface ApiCollection<T> {
  data: T[];
}

interface ApiResource<T> {
  data: T;
}

async function apiFetch<T>(path: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch (error) {
    console.error(`Failed to reach Reads-admin API at ${API_URL}${path}`, error);
    return null;
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Reads-admin API request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
}

function normalizeTranslator(translator: Translator): Translator {
  return {
    ...translator,
    avatarUrl: resolveAssetUrl(translator.avatarUrl),
    books: translator.books.map((book) => ({
      ...book,
      coverUrl: resolveAssetUrl(book.coverUrl),
    })),
  };
}

export async function getTranslators(locale: string): Promise<Translator[]> {
  const result = await apiFetch<ApiCollection<Translator>>(
    `/translators?locale=${encodeURIComponent(locale)}`
  );
  return (result?.data ?? []).map(normalizeTranslator);
}

export async function getTranslatorBySlug(
  slug: string,
  locale: string
): Promise<Translator | null> {
  const result = await apiFetch<ApiResource<Translator>>(
    `/translators/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`
  );
  return result?.data ? normalizeTranslator(result.data) : null;
}
