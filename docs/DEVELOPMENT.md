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

The localized homepage requests four collections in parallel, each through its
own endpoint in `lib/api.ts`:

- `GET /api/translators?locale={locale}` for translator cards (`getTranslators`).
- `GET /api/books?locale={locale}` for the complete book catalogue (`getAllBooks`).
- `GET /api/authors?locale={locale}` for the author catalogue (`getAuthors`).
- `GET /api/publishers?locale={locale}` for the publisher catalogue (`getPublishers`).

`getAuthors`/`getPublishers` also fetch `getAllBooks()` in parallel and
cross-reference the two by `authorId`/`publisherId` (falling back to a name
match for older rows) to attach each profile's `books` array and pick a cover
image when the profile itself has none. This means an author or publisher
with zero books still appears in the listing and has a working detail page —
grouping books by name, the previous approach, could only ever show a
profile once its first book existed.

Each translator card links to `/translator/{slug}`. The translator detail page
continues to use `GET /api/translators/{slug}` and keeps its existing profile,
book, excerpt, and inquiry workflow. `getAuthorBySlug`/`getPublisherBySlug`
call `/api/authors/{slug}` / `/api/publishers/{slug}` directly; if that 404s
they fall back to a name match against the full list, because the book detail
page links to `/author/{slugify(book.author)}` and `/publisher/{slugify(book.publisher)}`
— a client-computed guess at the real slug, not the real one (a book carries
its author/publisher's id and name, not their slug).

Image paths returned by Laravel are relative to the API origin. `lib/api.ts`
resolves them against `API_URL` before passing them to Next Image.

## Data contracts

The shared TypeScript contracts live in `lib/types.ts`.

`Author` and `Publisher` mirror `/api/authors` and `/api/publishers`
(`id`, `slug`, `name`, bio/nationality-or-country, life or founding years,
`portraitUrl`/`logoUrl`, `websiteUrl`, `bookCount`), plus a `books` array the
frontend attaches itself (see above) — the API doesn't nest it.

`Book` includes `authorId` and `publisherId` plus the existing titles, role,
source language, publisher, year, cover, and optional excerpt fields.

## Cache behavior

Translator, author, and book collections use five-minute ISR revalidation and
separate Next cache tags. The Laravel admin webhook remains responsible for
immediate invalidation when it is configured. A transient API failure is
allowed to throw rather than being cached as an empty catalogue.

## Related repository

Backend changes belong in `../reads-admin`. Read its
`docs/DEVELOPMENT.md` before changing migrations or API resources.