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

The catalogue is paginated by the API (thousands of books after the Asaxiy
import), so every page asks for exactly the slice it shows. Nothing fetches
the whole catalogue any more. The homepage requests, in parallel:

- `GET /api/translators?locale={locale}` for translator cards.
- `GET /api/books?per_page=8` for featured books, and its `meta.total` for the stat.
- `GET /api/authors?per_page=6` and `GET /api/publishers?per_page=4`, likewise.

`/books`, `/authors` and `/publishers` pass `?page=` through to the API.
`/books` also passes `q`, `category`, `author`, `publisher` and `series`.
Author and publisher pages fetch their profile plus
`GET /api/books?author={slug}` (or `publisher=`), the first 48 books, and
link to `/books?author=…` for the rest. The book page gets its editions and
"read next" list from `GET /api/books/{id}`; it no longer loads every book to
find related ones.

`Pagination` takes a locale-less `basePath` ("/books"). The i18n `Link` adds
the locale, so "/uz/books" would link to `/uz/uz/books`.

Each translator card links to `/translator/{slug}`. The translator detail page
continues to use `GET /api/translators/{slug}` and keeps its existing profile,
book, excerpt, and inquiry workflow.

Image paths returned by Laravel are relative to the API origin. `lib/api.ts`
resolves them against `API_URL` before passing them to Next Image.

## Data contracts

The shared TypeScript contracts live in `lib/types.ts`.

In Reads-admin a book is the work, and each printing is an edition
(publisher, ISBN, year, cover, translators). See `../Reads-admin/docs/DATA-MODEL.md`.

`Book` is a card: the work's titles, `authors[]`, `categories[]` and
`series`, plus `coverUrl`, `publisher`, `year`, `role` and `translators[]`
from its primary edition, and `editionCount`. On a translator's profile
each `books[]` entry is one edition they worked on (`editionId`).
`BookWithTranslator` on the book page adds `editions[]` (`Edition`),
`taqrizlar` and `relatedBooks[]`.

`Author` and `Publisher` come from their own endpoints with real slugs,
`bookCount`, and a few `coverUrls` for their cards. They are no longer
derived from the book list, which also means Cyrillic names no longer
slugify to an empty string.

List endpoints return `Paginated<T>` (`items`, `page`, `lastPage`, `total`).

## Cache behavior

Translator, author, and book collections use five-minute ISR revalidation and
separate Next cache tags. The Laravel admin webhook remains responsible for
immediate invalidation when it is configured. A transient API failure is
allowed to throw rather than being cached as an empty catalogue.

## Related repository

Backend changes belong in `../reads-admin`. Read its
`docs/DEVELOPMENT.md` before changing migrations or API resources.