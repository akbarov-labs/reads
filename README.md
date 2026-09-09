# Book Translator Portfolio — Prototype

A Next.js 15 prototype of a translator profile page for **Reads**, built for
stakeholder demos and user testing. Editorial-minimalist aesthetic, zinc/stone
neutral palette, sans-serif UI type paired with a literary serif for prose.

## Run it in Docker (recommended)

Development server with hot reload, at `http://localhost:3000`:

```bash
docker compose up
```

Production build (optimized, standalone output):

```bash
docker compose --profile prod up --build web-prod
```

Stop everything with `docker compose down`.

## Run it without Docker

```bash
npm install
npm run dev
```

## What's included

- `app/page.tsx` — translator listing / landing page
- `app/translator/[slug]/page.tsx` — the profile page MVP (header, stats,
  book grid, excerpt reader)
- `components/` — ProfileHeader, StatsBar, BookGrid, BookCard, ExcerptReader,
  and shared UI pieces
- `data/translators.ts` — realistic mock data for one Uzbek translator with
  three translated books (fictional titles, to keep the mock data free of
  copyrighted text)
- `public/` — generated SVG avatar and book covers (typographic, in-palette)

## Notes for the next iteration

- Swap `data/translators.ts` for a real data source (CMS or API) behind the
  same `Translator`/`Book` types in `lib/types.ts`.
- Replace the SVG covers/avatar in `public/` with real photography and cover
  scans once available — the `2:3` aspect ratio and `<Image fill>` usage in
  `BookCard` already expect real raster images.
