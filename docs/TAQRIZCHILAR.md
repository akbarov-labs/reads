# Taqrizchilar (book reviewers) — implementation spec

Status: decisions settled, not yet built. Spans both repos — `Reads`
(Next.js public site) and `Reads-admin` (Laravel + Filament).

## What this is

A new role, "taqrizchi", alongside today's only content-owner role,
"translator". A taqrizchi logs into Reads-admin, gets a public profile, and
writes a "taqriz" about a book: body text, an optional YouTube link, and an
optional score split across five fixed aspects. If the book is not in the
system yet, they add it inline while writing the taqriz.

## Ground truth (verified against both repos)

The original discussion assumed authors and publishers were derived on the fly
and that `Book` had no independent existence. That is **only true of the
frontend client**. The backend is further along:

- `authors` and `publishers` are real tables with real models
  (`2026_09_14_000001`, `2026_09_14_000002`), and `books` carries `author_id`
  and `publisher_id` foreign keys alongside the legacy `author` / `publisher`
  strings.
- `GET /api/books` and `GET /api/books/{book}` already exist
  (`BookController`, `CatalogBookResource`), as do `/api/authors` and
  `/api/publishers`.
- `CatalogBookResource` already exposes `translator` through `whenLoaded`, so a
  book with no translator degrades gracefully — the key is simply absent.

What is genuinely stale is `Reads/lib/api.ts`: `getAllBooks()` still walks
`getTranslators()` and flattens `books[]`, and `getAuthors`/`getPublishers`/
`getBookById` all derive from that walk, ignoring the endpoints that exist.

Two things therefore change shape from the original plan:

1. The frontend "switch off the translator-nested walk" is not blocked on new
   backend work. It can happen now, against endpoints already shipped.
2. The real backend blocker is narrower than assumed:
   `books.translator_id` is `foreignId()->constrained()->cascadeOnDelete()`,
   i.e. **non-nullable and cascading**.

### Hazard: `cascadeOnDelete`

Deleting a translator currently deletes their books. Once taqrizlar hang off
books, that cascade would silently destroy other people's reviews. The
migration must make `translator_id` nullable **and** switch the foreign key to
`nullOnDelete()`. Deleting a translator should orphan the book, not erase it.

## Settled decisions

| Question | Decision |
| --- | --- |
| Role | Dedicated `taqrizchi` role — own login, own public profile, same weight as `translator` |
| Book ownership | `Book` becomes standalone; `translator_id` nullable; taqrizchi can create a book from scratch |
| Cardinality | One taqriz per taqrizchi per book (unique on `taqrizchi_id + book_id`); many taqrizchilar per book |
| Score scale | **1–10, half-steps allowed** — decimal column, averages render as e.g. 7.4/10 |
| Missing translator | **"Tarjima sifati" is hidden entirely** when the book has no translator; average covers the remaining four aspects |
| Admin edits | **Admins can edit a taqrizchi-submitted book before and after approval** — no edit log for now |
| Profile fields | **Mirror `Translator` exactly** — name, avatar, bio, social links. No reputation score, no genre tags |
| Authorship | The taqrizchi themselves (primary), or an admin on their behalf |
| Moderation | Taqriz *and* any book created alongside it start `pending`; nothing public until approved |

### The five aspects

Fixed for every taqriz so scores stay comparable. Each scored independently and
optionally; the overall score is the average of whichever were filled in.

1. Syujet / voqealar rivoji (plot)
2. Uslub va til (style & language)
3. Tarjima sifati (translation quality) — *hidden when the book has no translator*
4. Muqova va nashr sifati (cover & print quality)
5. Umumiy taassurot (overall impression)

Because aspect 3 disappears on translator-less books, the average must divide by
the count of non-null aspects, never by a hardcoded 5.

### URLs

"taqriz" is used untranslated in the path, matching how "translator" is used today.

- `/taqrizchilar` — listing (mirrors `/translators`)
- `/taqrizchi/[slug]` — profile (mirrors `/translator/[slug]`)
- `/taqriz/[id]` — permalink for one taqriz, so a reviewer can share it directly
- `/book/[id]` — gains a "Taqrizlar" section listing approved taqrizlar

UI labels are translated per locale through next-intl messages as usual; only
the URL segment stays fixed.

## Work breakdown

### Reads-admin (Laravel + Filament)

- Add `Taqrizchi` to the `UserRole` enum. `User::canAccessPanel()` currently
  gates on `isTranslator() && translator()->exists()` — extend it so a
  taqrizchi with a profile gets in on the same terms.
- `Taqrizchi` model + table, mirroring `translators` (slug, name, avatar, bio,
  translatable fields, social links via the existing `social_links` relation).
- `Taqriz` model + table: `book_id`, `taqrizchi_id`, `body`, `youtube_url`
  nullable, five nullable decimal aspect columns, `status`
  (pending/approved/rejected), timestamps, unique index on
  `(taqrizchi_id, book_id)`.
- Migration on `books`: `translator_id` nullable **and** `nullOnDelete()`.
- Filament resources: combined "add book + write taqriz" flow for taqrizchilar,
  plus an approval queue for admins.
- API: `/api/taqrizchilar`, `/api/taqrizchilar/{slug}`, `/api/taqriz/{id}`;
  nest approved taqrizlar + average score into `CatalogBookResource`.
- Hook approval into `App\Services\SiteRevalidator` so `/api/revalidate` fires
  exactly as it does for book and translator writes.

### Reads (Next.js)

**Done** — `lib/api.ts` now reads `/api/books` and `/api/books/{id}` directly
instead of walking translators, `BookWithTranslator`'s translator fields are
optional, and every render site that assumed a translator is guarded. Verified
against a mock catalogue containing a translator-less book: the book page,
books listing, author page and publisher page all render it, the translator
card and "other by this translator" section drop out, and the meta description
omits the `tarjimon:` clause. Books that do have a translator are unchanged.

Not done, and still blocked on backend work — `getAuthors`/`getPublishers`
still derive from the flattened book list rather than `/api/authors` and
`/api/publishers`, because those endpoints cannot yet serve the detail pages:

- `Author` and `Publisher` have no `getRouteKeyName()`, so
  `/api/authors/{author}` binds by **id**, while the site routes on slug.
  Add `getRouteKeyName(): string { return 'slug'; }` to both models.
- `AuthorResource`/`PublisherResource` return no `books`, and `BookResource`
  omits `authorId`/`publisherId`, so there is no way to associate books with an
  author except by matching the free-text `author` string — which is what the
  frontend already does. Expose the ids (or nest the books) and the derivation
  can go.

Then, once the taqriz API shape is final:

- `lib/types.ts`: add `Taqrizchi`, `Taqriz`, `AspectScores`; make the translator
  fields on `BookWithTranslator` optional.
- `lib/api.ts`: `getTaqrizchilar`, `getTaqrizchiBySlug`, `getTaqrizById`; fold
  approved taqrizlar into book fetches. New cache tags alongside
  `TRANSLATORS_TAG` etc.
- Pages: `app/[locale]/taqrizchilar`, `app/[locale]/taqrizchi/[slug]`,
  `app/[locale]/taqriz/[id]`.
- Components: `TaqrizchiCard`, `TaqrizchiGrid`, `TaqrizCard` (score + excerpt +
  link), reused on both the book page and the profile.
- Book detail page: "Taqrizlar" section in the same visual language as the
  existing Excerpt and Related-books sections.
- Add `/taqrizchi/*` and `/taqriz/*` to `app/sitemap.ts`, excluding pending ones.

### Translator-coupling to unpick in Reads

Making the type optional is not enough — these render or interpolate translator
data unconditionally:

- `app/[locale]/book/[id]/page.tsx:30` — meta description hardcodes
  `tarjimon: ${book.translatorName}`
- `app/[locale]/book/[id]/page.tsx:167-178` — translator link block
- `app/[locale]/book/[id]/page.tsx:66` — related-books filter on `translatorSlug`
- `lib/jsonld.ts` — `bookNode()` assigns a `translator` node by role
- `lib/seo.ts` — translator-centric metadata helpers

## Suggested order

1. ~~Reads: repoint `lib/api.ts` at the real catalogue endpoints, and guard the
   translator-coupled call sites.~~ **Done.**
2. Reads-admin: migration (nullable + `nullOnDelete`), models, Filament
   resources, API, revalidation. While there, the two small fixes above
   (`getRouteKeyName`, `authorId`/`publisherId` on `BookResource`) retire the
   last of the derive-from-books logic.
3. Reads: taqriz types, API client, pages, components.

## Note on cache invalidation

`getAllBooks()` is tagged `BOOKS_TAG`, not `TRANSLATORS_TAG`. Back when it
walked translators, the admin webhook's `revalidateTag(TRANSLATORS_TAG)`
invalidated the catalogue as a side effect; it no longer does, so
`app/api/revalidate/route.ts` drops `BOOKS_TAG` explicitly. Any future fetch
that gets its own tag needs the same treatment, or it will quietly wait out the
five-minute ISR window instead of updating on save.
