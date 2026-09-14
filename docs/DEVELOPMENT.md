# Reads development guide

Reads is the public Next.js site. The private `reads-admin` Laravel application
owns translators, authors, books, inquiries, media, and the admin panel.

## Local Docker startup

Start the frontend from this directory:

```sh
docker compose up -d web
```

The site is available at `http://localhost:3000`.

The frontend expects the Laravel API at `API_URL`. In the development compose
file the default is `http://host.docker.internal:8000/api`, so the backend must
publish port 8000 on the host.

## Validation

Run checks inside the frontend container:

```sh
docker compose exec -T web npx tsc --noEmit
docker compose exec -T web npm run lint
docker compose exec -T web npm run build
```

The production build requests live API data while generating translator routes.
Run it only when `reads-admin` is available at the configured API URL.

## Homepage data flow

The localized homepage requests three collections in parallel:

- `GET /api/translators?locale={locale}` for translator cards.
- `GET /api/authors?locale={locale}` for the author catalogue.
- `GET /api/books?locale={locale}` for the complete book catalogue.
- `GET /api/publishers?locale={locale}` for the publisher catalogue.

Each translator card links to `/translator/{slug}`. The translator detail page
continues to use `GET /api/translators/{slug}` and keeps its existing profile,
book, excerpt, and inquiry workflow.

Image paths returned by Laravel are relative to the API origin. `lib/api.ts`
resolves them against `API_URL` before passing them to Next Image.

## Data contracts

The shared TypeScript contracts live in `lib/types.ts`.

`Author` includes `id`, `slug`, `name`, localized biography and nationality,
life dates, optional portrait and website URLs, and `bookCount`.

`Book` includes `authorId` plus the existing titles, role, source language,
publisher and `publisherId`, year, cover, and optional excerpt fields.

## Cache behavior

Translator, author, and book collections use five-minute ISR revalidation and
separate Next cache tags. The Laravel admin webhook remains responsible for
immediate invalidation when it is configured. A transient API failure is
allowed to throw rather than being cached as an empty catalogue.

## Related repository

Backend changes belong in `../reads-admin`. Read its
`docs/DEVELOPMENT.md` before changing migrations or API resources.