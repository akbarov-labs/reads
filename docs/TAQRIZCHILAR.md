# Taqrizchilar (book reviewers) — implementation spec

Status: built, tested, not yet deployed. Spans both repos — `Reads`
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

## What was built

### Reads-admin

- `UserRole` gains `Taqrizchi` and `Publisher`. `User::canAccessPanel()` grants
  access to either, on the same terms as translators: the role alone is not
  enough, the account must have a profile to manage.
- `Taqrizchi` and `Taqriz` models, with `TaqrizStatus` and `ModerationStatus`.
- Six migrations: `books.translator_id` nullable and `nullOnDelete`;
  `taqrizchilar`; `social_links` made polymorphic; `taqrizlar`; `books.status`;
  `publishers.user_id`.
- Moderation lives in `TaqrizObserver`, not in the form that renders the
  field. A reviewer cannot publish their own work even going straight at the
  model, and editing a published taqriz returns it to the queue.
- Filament: `TaqrizchiResource`, `TaqrizResource` (with the combined "add a
  book and review it" flow and an approve action), `TaqrizchiProfileWidget`,
  and publisher self-service on `PublisherResource`.
- API: `/api/taqrizchilar`, `/api/taqrizchilar/{slug}`, `/api/taqrizlar/{id}`,
  with approved taqrizlar and an average score nested into book responses.
  Unapproved rows are never loaded rather than loaded and filtered, and a
  pending permalink is 404 rather than 403 — 403 would confirm it exists.

### Reads

- `lib/api.ts` reads `/api/books` directly; `getTaqrizchilar`,
  `getTaqrizchiBySlug`, `getTaqrizById` added.
- Pages: `/taqrizchilar`, `/taqrizchi/[slug]`, `/taqriz/[id]`, a Taqrizlar
  section on book pages, a reviewers section on the home page, all three
  locales at full key parity.
- `ScoreBadge`, `AspectBreakdown`, `TaqrizCard`, `TaqrizchiCard`.
- The revalidate webhook reads `type` and `id`, so a book ping invalidates one
  book rather than the whole catalogue.

## Decisions taken during the build

**Book status defaults to Approved, not Pending.** Every book that existed
before this branch was entered by a translator or an admin and is already
live. Defaulting to Pending would have silently unpublished the entire
catalogue on deploy and queued every future translator-entered book. The
taqrizchi flow opts into the queue explicitly instead — the narrow path opts
in rather than the whole table opting out.

**Publisher-added books go live immediately.** A publisher describing their
own catalogue is the primary source for it, unlike a taqrizchi adding somebody
else's book in order to review it.

**A Book row is an edition, not a work.** Two publishers issuing the same
public-domain title each own their own row, with their own cover, year and
print run. One row cannot hold both covers, and sharing one would make the
"Muqova va nashr sifati" aspect meaningless. Editions of the same work already
share `author_id` and `original_title`, so "other editions" is derivable
without a new table. Genuine co-publishing — two publishers on one physical
edition — would need a `book_publisher` pivot; deferred until a real one
appears, because adding it later is a small migration whereas building it now
complicates ownership for every book.

**`publishers.user_id` is nullable**, so "owned by nobody" is a real state the
authorisation code handles deliberately. `null == null` would otherwise hand
every backfilled row to whichever publisher asked first.

## Still open

- The site's author and publisher pages still derive from the flattened book
  list. Both blockers are now gone — `BookResource` emits `authorId` and
  `publisherId`, and both models resolve by slug or id — so this is a
  frontend-only change whenever it is wanted.
- Co-publishing, as above.
- A taqrizchi has no public reputation or rating; the profile mirrors a
  translator's exactly, as agreed.

## Note on cache invalidation

`getAllBooks()` is tagged `BOOKS_TAG`, not `TRANSLATORS_TAG`. Back when it
walked translators, the admin webhook's `revalidateTag(TRANSLATORS_TAG)`
invalidated the catalogue as a side effect; it no longer does, so
`app/api/revalidate/route.ts` drops `BOOKS_TAG` explicitly. Any future fetch
that gets its own tag needs the same treatment, or it will quietly wait out the
five-minute ISR window instead of updating on save.
