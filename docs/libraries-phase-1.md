# Libraries (kutubxonalar), phase 1

Written for: whoever builds it, in reads-admin and in Reads. Status: built
(reads-admin `feat/libraries`, `feat/library-import`, `feat/library-api`;
Reads `feat/libraries`). Where the build differs from this plan:

- `libraries.is_published` (a toggle, admin-only) instead of a
  pending/approved/hidden `status`: every library is one an admin set up.
- Phone, Telegram, Instagram and website are columns on `libraries`, not
  `social_links`, which has no phone.
- Owner edits stay live (open question 2), holdings are per book with an
  optional edition (question 1), and the region list covers the whole
  country with Tashkent's twelve districts fixed (question 3).
- "Yangilandi … oldin" is a date ("24-oktabr holatiga"), because a cached
  page cannot keep "2 kun oldin" true.
- Map links go to Yandex Maps.

## What phase 1 delivers

A reader on a book page sees which libraries hold that book and whether a copy
is free right now:

> **Kutubxonalarda**
> Mehr kutubxonasi · Shayxontohur — 1 ta bor · yangilandi 2 kun oldin
> Idrok kutubxonasi · Oqqo'rg'on — hammasi band

A library owner signs in to reads-admin, keeps their library's page up to
date, uploads their book list from Excel, and marks copies as lent out or
returned.

Phase 1 also includes a public list of libraries and a page for each library.

**Not in phase 1:** connecting to a library's own system through its API, reservations,
borrower records of any kind, owners signing themselves up, maps, and the "readers
looked for X near you" demand report. Each of these is listed under *Later* at the end.

## How it fits what exists

Every piece already has a model in the code:

| Need | Copy from |
|---|---|
| Owner signs in, sees only their own row | Publisher: `users.role = publisher`, `publishers.user_id`, `PublisherResource::getEloquentQuery()` scoping, `PublisherPolicy`, `PublisherProfileWidget`, `User::canAccessPanel()` |
| Telegram / Instagram / phone links | `social_links` (already polymorphic) |
| Translatable description and hours | `spatie/laravel-translatable`, as on translators and publishers |
| Reading Excel | OpenSpout, as in `App\Support\Asaxiy\AsaxiyCatalog` |
| ISBN cleanup | `CatalogueSync::normalizeIsbn()` |
| Title/author matching | `UzbekText` normalisation, `author_aliases` |
| Pending → approved | `status` on books and editions |
| Site cache drop on save | `SiteRevalidator` + an observer, like `QuoteObserver` |
| Book page slot | the `where-to-get` section in `app/[locale]/book/[id]/page.tsx` (store links) |

## 1. Data model (reads-admin)

### `libraries`

| column | type | note |
|---|---|---|
| id | | |
| user_id | fk users, nullable, unique | the owner; null while the admin runs it |
| name | string | |
| slug | string, unique | |
| description | json (translatable) | |
| region | string | "Toshkent shahri", "Samarqand viloyati" … |
| district | string | "Shayxontohur tumani" — what the list filters and the card badge show |
| address | text | free text; Mehr's entrance directions fit here |
| latitude, longitude | decimal, nullable | stored now, map later |
| hours | json (translatable), nullable | free text: "Du–Sha 10:00–20:00" |
| membership | json (translatable), nullable | "A'zolik bepul" / "oyiga 30 000 so'm, pasport bilan" |
| photo_path | string, nullable | |
| status | string | pending / approved / hidden, as on books |
| holdings_updated_at | timestamp, nullable | bumped by any holding change; drives "yangilandi … oldin" |
| timestamps | | |

Plus `social_links` rows (morph) for Telegram, Instagram, phone and website.

### `library_holdings`

One row per book a library holds.

| column | type | note |
|---|---|---|
| id | | |
| library_id | fk, cascade | |
| book_id | fk, cascade | **the work**, not the edition |
| edition_id | fk, nullable, null on delete | which printing, when known (from ISBN) |
| copies_total | unsigned smallint, default 1 | |
| copies_available | unsigned smallint | 0 ≤ available ≤ total, enforced in the model |
| note | string, nullable | the owner's shelf code etc., never shown publicly |
| timestamps | | `updated_at` is "last updated" for this book |

Unique `(library_id, book_id)`. Index `book_id` (the book page's query).

**Why book-level:** the reader asks "is *O'tkan kunlar* there?", not "is the 2019
Sharq edition there?". Most library lists have no ISBN, so we often can't tell
the edition anyway. When we can tell, we store it, and the block can show "Yangi asr avlodi nashri".
The catch: two different translations of one book in the same library become one row. That's rare enough to
accept for now (see *Open questions*).

### `library_imports` and `library_import_rows`

The import has a staging step, so nothing reaches `library_holdings` until a match is confirmed.

`library_imports`: id, library_id, user_id, original filename, row counts
(total / matched / needs review / unmatched), status (review / applied), timestamps.

`library_import_rows`: id, library_import_id, row number, raw title, raw author,
raw ISBN, copies, available (nullable), matched_book_id (nullable),
matched_edition_id (nullable), match (isbn / exact / suggested / manual / none),
decision (pending / accept / skip), timestamps.

Drop applied imports after 90 days. They only exist for review.

### Role

- `UserRole::Library = 'library'`, label "Library".
- `User::library(): HasOne`, `User::isLibrary()`.
- `canAccessPanel()`: a library user needs a library row, the same rule publishers have.

## 2. Owner side in the panel (reads-admin)

**Accounts.** An admin creates the user and the library together, with an "invite owner" action on
`LibraryResource`. There's no self sign-up in phase 1, and every library is one we've spoken to.

**`LibraryResource`**
- Admin: all libraries, status column, create/edit/hide.
- Owner: scoped to their own row, the way `PublisherResource` does it, and they can't change `status`.
  Edits by an owner keep the library approved (owners are trusted once invited),
  the same as publishers.
- Form: name, description, region + district (select from a fixed list in
  `App\Enums\District` or a config file, so the filters stay clean), address, hours,
  membership, photo, social links relation manager.

**`HoldingsRelationManager`** on the library:
- Table: cover, title, author, edition, `copies_available / copies_total`, updated.
- Row actions **Berildi** (available −1) and **Qaytdi** (available +1). Two
  clicks at the desk. This is the action owners will use most, so it must be
  the fastest thing in the panel.
- Add one book: a search select over our books (title, author, ISBN, the same
  query as `BookController@index`) plus copies.
- Bulk "hammasi qaytdi" (set available = total), for the occasional stock-take.
- Filter: "band" (available = 0).

**`LibraryProfileWidget`** on the dashboard: how many books, how many are lent out,
when they were last updated, and a link to the public page. It's a copy of `PublisherProfileWidget`.

## 3. Import (reads-admin)

**Template.** A downloadable `.xlsx` with the columns *Nomi*, *Muallif*, *ISBN*,
*Soni*, *Mavjud* (the last three are optional). CSV is accepted too. The header names are
matched loosely (uz/ru/en, either case) because owners will use their own files.

**Matching**, row by row, the first rule that hits wins:

1. **ISBN.** Normalise with `CatalogueSync::normalizeIsbn()`, then match an approved edition, which gives
   both the book and the edition. → `isbn`, accepted automatically.
2. **Exact.** Title and author normalised with `UzbekText` (apostrophes,
   case, o'/oʻ/о‘ variants), with the author also checked against `author_aliases`. Exactly one
   approved book → `exact`, accepted automatically.
3. **Suggested.** The title matches one or more books, but the author doesn't, or there are several
   candidates. → `suggested`, offered for review with up to 3 candidates.
4. **None.** → `none`.

Run it inline (no queue). A library's list is hundreds of rows, not thousands.
Cap the upload at 5,000 rows.

**Review screen** (a Filament page on the import):
- Three tabs: *Matched*, *Needs review*, *Not found*.
- For *Needs review*: pick a candidate, search for another book, or skip.
- For *Not found*: search and link by hand, or skip. Phase 1 does **not**
  create books from library rows. A library's spelling of titles isn't good
  enough to grow the catalogue from. Unmatched rows stay listed so the admin
  can see what's missing from the catalogue.
- **Apply.** Upsert `library_holdings` by `(library_id, book_id)`: set
  `copies_total`, and set `copies_available` from *Mavjud* if given, otherwise to the
  total on new rows and left alone on existing ones. A checkbox, off by default,
  removes holdings that aren't in this file. One transaction, then bump
  `holdings_updated_at` and revalidate once, not once per row.

## 4. API (reads-admin)

All of these are inside the existing `throttle:public-read` group, and they only show approved libraries and
approved books.

`GET /api/books/{id}` adds:

```json
"libraries": [
  { "slug": "mehr", "name": "Mehr kutubxonasi", "district": "Shayxontohur tumani",
    "copiesTotal": 2, "copiesAvailable": 1, "updatedAt": "2026-10-23T09:12:00Z" }
]
```

Order: free copies first, then the most recently updated. Return all of them; the site
decides how many to show.

`GET /api/libraries`: approved libraries, with `?district=` and `?region=`
filters. Each row has name, slug, district, address, photo and `bookCount`.

`GET /api/libraries/{slug}`: the profile (description, hours, membership,
social links, `holdingsUpdatedAt`) plus `books[]`, paginated with the usual
`?page` / `?q`. Each entry is a book card plus `copiesTotal` / `copiesAvailable`.

`GET /api/sitemap` adds `libraries`.

**Revalidation.** `LibraryObserver` and `LibraryHoldingObserver` call
`SiteRevalidator` with the library's tag and, for a holding, `bookTag(book_id)`.
The import's Apply sends one batch with every affected book tag.

## 5. Site (Reads)

**Book page.** Inside the existing `where-to-get` section, under the store
links, add a `LibraryAvailability` component:
- It only renders when `book.libraries` isn't empty. There's no empty state, because "no library has
  this" isn't something a reader needs to read.
- Show up to 4 rows: library name (link), district, and a status of **"N ta bor"**
  (green), **"hammasi band"** (muted), plus "yangilandi … oldin".
- If `updatedAt` is older than 60 days, add "ma'lumot eskirgan bo'lishi
  mumkin". A wrong "bor" costs trust, so we say when we don't know.
- More than 4 → "yana N ta kutubxona", which expands in place.

**Library list:** `app/[locale]/libraries/page.tsx`, using the same pattern as
`publishers`. It's a card grid (photo, name, district badge, book count, address)
with a district filter. The card is close to asarlar.uz's, so readers will
recognise it.

**Library page:** `app/[locale]/library/[slug]/page.tsx`. It has a header (photo, name,
district, address, hours, membership, Telegram/phone buttons), then the book
grid with search and "faqat bor kitoblar" toggle. Add the JSON-LD `Library`
schema type (a LocalBusiness) for "kutubxona Chilonzor" searches.

**Navigation.** A footer link first. It moves to the header once there are about 8 libraries,
so the header doesn't send people to a list of three.

**Also:** `lib/api.ts` (`getLibraries`, `getLibrary`, `LIBRARIES_TAG`,
`libraryTag`), the types in `lib/types.ts`, strings in `messages/{uz,ru,en}.json`, and the
sitemap.

## 6. Delivery

Four PRs, in this order. Each one ships on its own:

1. **admin: libraries + owner role.** Migrations, models, role, `LibraryResource`,
   holdings relation manager with Berildi/Qaytdi, widget, policies, tests.
2. **admin: import.** Template, matcher, review page, apply, tests (matcher
   cases: ISBN with dashes, ISBN-10, o'/oʻ spelling, author alias, two
   candidates).
3. **admin: API.** `libraries[]` on the book, the two library endpoints, sitemap,
   observers + revalidation, tests.
4. **reads: book block + pages.** Can start once PR 3's response shape is agreed,
   using a fixture until it's merged.

Then on **staging**: add 2–3 real libraries with their owners' permission, have one
owner run an import, and check the book page. Only after that does it go to production.

Data comes from the libraries themselves. We don't copy listings from asarlar.uz or
anywhere else.

## Open questions

1. **Book or edition?** The plan holds at the book level with an optional edition. If
   translation quality should show here too ("Mehr has the Ibrohim G'afurov translation"), the
   unique key becomes `(library_id, book_id, edition_id)` and imports without ISBN
   need an edition picker. That's more work for owners.
2. **Moderation of owner edits.** The plan trusts invited owners, the same as publishers. Should
   a name or address change go back to pending?
3. **District list.** Tashkent's 12 districts only to start, or all of the country from day one?

## Later

- **Phase 2: integration.** Libraries with their own system implement our
  contract: `GET /books` (catalogue, for matching ahead of time) and `GET /availability?isbn=&title=&author=`
  → `{held, total, available, nextDue}`, authenticated with an API key. We call it with a short timeout and
  cache for 15–30 min, and "unknown" is a real state. `CatalogueSync` and
  `EnsureCatalogueSyncToken` are the precedent for token-guarded sync.
- **Demand report for owners:** book views and search queries from their
  district for books they don't hold. It builds on the site stats.
- Reservations via Telegram, a map, and owner self sign-up with verification.
