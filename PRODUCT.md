# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Uzbek readers choosing a book. They arrive from search or a shared link and
want to know what a book is, which editions and translations exist, who
translated and published it, and what reviewers and other readers think of
it. Translators, authors and publishers have profile pages, but they support
the reader's choice rather than lead it.

## Product Purpose

The public catalogue of Kitoblarim: Uzbek books and translations, their
editions, translators, authors and publishers, critics' reviews (taqrizlar)
and Kitoblarim readers' ratings and reviews. The site is where a reader
finds and judges a book; the Kitoblarim Telegram bot is where they read it to
the end. Success is a reader leaving with a book they want to read, and
planning it in the bot.

## Positioning

The only catalogue of Uzbek books built around their translations and
editions, fed both by its editors and by the readers of the Kitoblarim bot
(their books, ratings and opt-in reviews sync both ways). Finding a book here
and finishing it in the bot are one product.

## Operating Context

- Mostly phones, often arriving from search or a Telegram share.
- Three languages: Uzbek (default), Russian, English (`next-intl`).
- Content comes from reads-admin (Laravel + Filament at dashboard.kitoblarim.uz);
  the site has no database. Pages are ISR-cached and revalidated by webhook.
- Every book page links into the bot: `t.me/kitob_javonim_bot?start=plan_<ISBN>_reads`;
  the footer links `?start=src_reads`.

## Capabilities and Constraints

- Listings and detail pages for books, translators, authors, publishers and
  taqrizchilar; taqriz permalinks; editions per book; generated Open Graph
  images; sitemap, robots, llms.txt.
- Kitoblarim readers' section on book pages: anonymous average rating and
  editor-approved reader reviews (first name only).
- The domain stays as it is (owner decision, 2026-10-12).
- Partner tag `reads` in bot links stays: the bot's stats count it.

## Brand Commitments

- Name: **Kitoblarim**, the same as the bot ("Reads" is retired, 2026-10-12).
  In page titles: "Kitoblarim — oʻzbek kitoblari katalogi"; book pages end
  "| Kitoblarim".
- Logo and icons: the Kitoblarim brand assets in the bot repository
  (`public/brand/logo-mark.svg`, `logo-mark-dark.svg`, `app-icon.svg`,
  `favicon.svg`, `og-image.png`).
- Kitoblarim's one promise: "finish what you start, a few pages a day"
  (uz: "Boshlagan kitobingizni oxirigacha oʻqing — har kuni bir necha bet").
  The site states it where it hands a reader to the bot.

## Evidence on Hand

- About 8.8k approved editions, with real translators, authors, publishers
  and taqrizlar from reads-admin.
- Reader ratings and reviews only exist once bot readers rate or publish; no
  invented counts, testimonials or "popular" claims.

## Product Principles

1. The reader's choice comes first: a book page answers "should I read this,
   and in which edition?" before anything else.
2. One product, one name: the site and the bot speak with the same voice and
   promise, and the hand-off to the bot is a natural next step, never an ad.
3. Real numbers only: ratings, counts and reviews come from data.
4. Uzbek first, done properly in all three languages.
