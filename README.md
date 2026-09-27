# Reads

The public Next.js site for **Reads** — a catalogue of Uzbek book
translators, the authors and publishers behind their books, and reader
reviews ("taqrizlar") written by registered reviewers ("taqrizchilar").

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, `next-intl`
for `uz` / `ru` / `en` locales. All content is served by the private
`reads-admin` Laravel + Filament application — this repo has no database
of its own.

## What's included

- `app/[locale]/` — localized pages: home, translators/authors/publishers/
  books listings and detail pages, taqrizchilar listing and profile pages,
  taqriz permalinks, per-book reviews section.
- `app/og/[locale]/[slug]` — generated Open Graph images.
- `app/api/revalidate` — webhook the admin panel calls to bust ISR cache
  tags on save.
- `app/sitemap.ts`, `app/robots.ts`, `app/llms.txt` — SEO/discovery routes.
- `lib/api.ts` — all data fetching against the Laravel API, cache tags, and
  normalization of API responses into the frontend's types.
- `lib/types.ts` — shared TypeScript contracts (`Translator`, `Book`,
  `Author`, `Publisher`, `Taqrizchi`, `Taqriz`, ...).
- `components/` — cards, grids, profile headers, score badges, and other
  shared UI.
- `i18n/`, `messages/` — `next-intl` routing config and translation files
  for `uz`, `ru`, `en`.

## Run it in Docker (recommended)

```bash
docker compose up -d web
```

The site is available at `http://localhost:3000`. It expects the Laravel
API at `API_URL` (defaults to `http://host.docker.internal:8000/api` in
development, so `reads-admin` must be running and publishing port 8000).

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the local workflow and
validation commands, and [DEPLOY.md](DEPLOY.md) for production deployment.

## Run it without Docker

```bash
npm install
npm run dev
```

## Related repository

Translators, authors, books, publishers, taqrizchilar, and the admin panel
all live in the private `reads-admin` repository. Backend changes belong
there — read its `docs/DEVELOPMENT.md` before changing migrations or API
resources.
