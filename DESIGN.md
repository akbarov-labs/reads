---
name: Kitoblarim — katalog
description: The public catalogue of Uzbek books and translations, drawn by the same hand as the Kitoblarim Telegram bot.
colors:
  deep-forest: "#1F4D2E"
  forest-press: "#163A22"
  forest-night: "#0F2A18"
  forest-steady: "#2F6440"
  sage: "#4A7D57"
  sage-light: "#6F9C77"
  fern-line: "#A3C2A5"
  fern-border: "#C9DBC8"
  forest-mist: "#E3ECE2"
  forest-wash: "#F1F5F0"
  star-gold: "#D0951A"
  bone-paper: "#F6F7F4"
  paper-shade: "#EEF1EC"
  paper-line: "#E1E5DF"
  paper-rule: "#CBD2C9"
  ink-quiet: "#5F6862"
  ink-muted: "#535B56"
  ink-soft: "#444B47"
  ink-strong: "#343A36"
  ink-deep: "#252B27"
  ink: "#141A16"
  card-white: "#FFFFFF"
typography:
  display:
    fontFamily: "Literata Okina, Literata Variable, Georgia, Times New Roman, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline-book:
    fontFamily: "Literata Okina, Literata Variable, Georgia, Times New Roman, serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.11
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Literata Okina, Literata Variable, Georgia, Times New Roman, serif"
    fontSize: "1.875rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Literata Okina, Literata Variable, Georgia, Times New Roman, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.375
  figure:
    fontFamily: "Literata Okina, Literata Variable, Georgia, Times New Roman, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.11
    fontFeature: "tnum"
  reading:
    fontFamily: "Literata Okina, Literata Variable, Georgia, Times New Roman, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
  wordmark:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  ui:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  caption:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  label:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0.05em"
  label-spaced:
    fontFamily: "Onest Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "0.2em"
rounded:
  sm: "2px"
  base: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
  mark: "22.5%"
spacing:
  card-sm: "16px"
  card: "20px"
  card-lg: "24px"
  grid-gap: "16px"
  shelf-gap-x: "20px"
  shelf-gap-y: "40px"
  gutter: "24px"
  gutter-sm: "32px"
  gutter-lg: "48px"
  section: "64px"
  section-lg: "80px"
components:
  button-primary:
    backgroundColor: "{colors.deep-forest}"
    textColor: "{colors.card-white}"
    typography: "{typography.ui}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.forest-press}"
    textColor: "{colors.card-white}"
  bot-handoff:
    textColor: "{colors.deep-forest}"
    typography: "{typography.ui}"
    rounded: "{rounded.xl}"
    padding: "8px 14px 8px 8px"
  bot-handoff-hover:
    backgroundColor: "{colors.forest-mist}"
    textColor: "{colors.deep-forest}"
  chip-category:
    textColor: "{colors.ink-soft}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-category-active:
    backgroundColor: "{colors.deep-forest}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  input-search:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.card}"
  card-person:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-sm}"
  card-details:
    backgroundColor: "{colors.bone-paper}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.card-lg}"
  book-cover-shelf:
    backgroundColor: "{colors.paper-shade}"
    rounded: "{rounded.sm}"
  role-tag:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink-strong}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  score-badge:
    backgroundColor: "{colors.forest-wash}"
    textColor: "{colors.forest-night}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  site-header:
    backgroundColor: "{colors.bone-paper}"
    padding: "14px 0"
  locale-switcher:
    textColor: "{colors.ink-soft}"
    typography: "{typography.ui}"
    rounded: "{rounded.lg}"
    padding: "6px 8px"
  locale-switcher-open:
    backgroundColor: "{colors.paper-shade}"
    textColor: "{colors.ink}"
  locale-menu:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.xl}"
    padding: "6px"
    width: "176px"
  pagination-current:
    backgroundColor: "{colors.deep-forest}"
    textColor: "{colors.card-white}"
    typography: "{typography.ui}"
    rounded: "{rounded.lg}"
    size: "36px"
  link-quiet:
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
  link-quiet-hover:
    textColor: "{colors.forest-press}"
---

# Design System: Kitoblarim — katalog

## Overview

**Creative North Star: "The Same Hand"**

The catalogue is drawn by the same hand as the Kitoblarim bot and its landing page, so a reader who follows a book from here into Telegram feels a page turn, not a change of shop. It is a quiet paper world: Bone Paper ground, ink neutrals tinted toward one forest green, the book-spine K in its green tile, Literata for every title and Onest for everything a reader operates. The layout of the older Reads site was kept, and only its identity changed. That is why the structure reads as an ordinary editorial catalogue and the character comes from the materials.

Density is calm and phone-first. Sections breathe (64px, 80px from 640px up), cards are white plates on paper with hairline borders, and the only motion is small and physical: a cover lifts off the shelf, an arrow nudges forward, the mark tips by three degrees. Colour is almost absent. Green marks what you can act on, gold marks what readers rated, and nothing else is coloured.

The direction refuses the generic amber-on-stone "literary site" and refuses a second brand. The hero carries no kicker and no decorative gradient. The hand-off to the bot is the same brand's next step, set as a quiet green line with the mark beside it, never as a banner.

**Key Characteristics:**
- One accent (Deep Forest Green); all neutrals tinted toward it.
- Literata for books, names, headings and figures; Onest for interface.
- White plates on Bone Paper, separated by hairlines, flat at rest.
- 2:3 covers on a shelf that lift when touched.
- Light only, as built; the bot's dark tokens exist upstream.

## Colors

A green-tinted paper-and-ink palette with a single forest accent and one reserved gold.

### Primary
- **Deep Forest Green** (#1F4D2E, `forest-700`): the colour of the logo tile and of every action. It is used for links that lead somewhere ("Barcha tarjimonlar" and the "view profile" links on cards), the search button, the active category chip, the current page in pagination, the active locale, the bot hand-off, the focus ring, the caret and the native `accent-color`.
- **Forest Press** (#163A22, `forest-800`): the pressed or hover state of the filled button, and the hover colour for names and titles that turn green on hover.
- **Forest Night** (#0F2A18, `forest-900`): text on green tints (score badge, text selection) and hover for green text links.
- **Forest Steady** (#2F6440, `forest-600`): the "/10" in the score badge, at 70% opacity. Rarely used.

### Secondary
- **Sage** (#4A7D57, `forest-500`): the bookmark ribbon inside the mark (and in share cards). It is not used as a UI colour on the site.
- **Sage Light** (#6F9C77, `forest-400`): the fill of the per-aspect score bars, and the border of a hovered category chip.
- **Fern Line** (#A3C2A5, `forest-300`): the underline colour of every link (`a` defaults), and the border of a hovered card.
- **Fern Border** (#C9DBC8, `forest-200`): the border of the score badge.
- **Forest Mist** (#E3ECE2, `forest-100`): the hover plate behind the bot hand-off, and the background of text selection.
- **Forest Wash** (#F1F5F0, `forest-50`): the score badge ground and initial-letter avatars.

### Tertiary
- **Star Gold** (#D0951A, `star`): only for Kitoblarim readers' star ratings: the filled stars on a review and the single star beside the average. It is 2.6:1 on white, so a star always sits next to a number or carries an `aria-label`. It is never used as text colour.

### Neutral
The Tailwind `stone` and `zinc` scales both resolve to this one ink scale (tailwind.config.ts), so `text-zinc-500` and `bg-stone-100` are the same family.
- **Bone Paper** (#F6F7F4, `stone-50`): the page ground, the `<html>` background, the browser `theme-color`, the header (at 90% opacity with a blur), the footer and the details plate.
- **Paper Shade** (#EEF1EC, `stone-100`): hover and open plates for quiet controls (the locale switcher, pagination), cover placeholders, and plain avatars.
- **Paper Line** (#E1E5DF, `stone-200`): every hairline, including card borders, section rules, the header's bottom edge and the 1px gaps of the stats grid.
- **Paper Rule** (#CBD2C9, `stone-300`): input and chip borders, the lockup divider, link underlines in muted text, empty rating stars, and the scrollbar thumb. Never used for text.
- **Ink Quiet** (#5F6862, `400`): the lightest text allowed. It is used for small meta, field labels, counts and breadcrumbs, and measures 5.4:1 on Bone Paper and 5.1:1 on Paper Shade.
- **Ink Muted** (#535B56, `500`): secondary lines such as the hero subline, the original title in italics, descriptions under titles and the lockup's "katalog".
- **Ink Soft** (#444B47, `600`): navigation and chip text at rest.
- **Ink Strong** (#343A36, `700`): running prose such as descriptions, review bodies, edition values and the role tag.
- **Ink Deep** (#252B27, `800`): the long-form taqriz body.
- **Ink** (#141A16, `900`): headings, titles, names, figures and the wordmark. It measures 16.4:1 on Bone Paper.
- **Card White** (#FFFFFF): the plate colour for cards, the stats cells, the search input, the locale menu and the white bands of the home page. Note that the landing's plate core is #FDFDFB and the catalogue uses pure white.

The catalogue ships light only (`colorScheme: "light"`, no `dark:` classes). The bot's landing page defines a full dark set (ground #0F1311, accent #8CCB9F). Any future dark theme takes those values instead of inventing new ones.

### Named Rules
**The One Accent Rule.** Deep Forest Green is the only colour that means "act here". Every link, button, active state and focus ring uses the `forest` scale. The site does not add a second hue for emphasis.

**The Gold Is For Stars Rule.** Star Gold appears only on readers' star ratings. The editors' taqriz scores (out of ten) are forest, never gold, so the two sources of judgement stay distinguishable.

**The One Ink Rule.** Neutrals come from the aliased `stone`/`zinc` ink scale and nowhere else. Tailwind's default grays, emerald and amber are not part of this world.

## Typography

**Display Font:** Literata (self-hosted variable, `@fontsource-variable/literata`, upright and italic), with Georgia and Times New Roman as fallbacks, always behind the "Literata Okina" face.
**Body Font:** Onest (self-hosted variable, `@fontsource-variable/onest`), with ui-sans-serif, system-ui, -apple-system and Segoe UI as fallbacks.

**Character:** A bookish text serif for everything that is a book, a person or a number, set against a clean geometric grotesque for everything a reader operates. This is the same pairing and the same split as the bot's landing page.

### Hierarchy
- **Display** (400, 2.25rem → 3rem at 640px → 3.75rem at 1024px, line-height 1.1, -0.025em): the home hero headline only, in Ink, with deliberate line breaks (`whitespace-pre-line`), max-width 42rem.
- **Headline, book** (600, 1.875rem → 2.25rem at 640px, -0.025em): the book's own title on its page. This is the only semibold Literata on screen, and share cards use the same weight.
- **Headline** (400, 1.5rem → 1.875rem at 640px, line-height 1.2, -0.025em): page titles (Kitoblar) and section headings (Tarjimonlar, Taqrizlar, Nashrlar). Sub-section headings inside cards step down to 1.125rem.
- **Title** (400, 1.125rem, line-height 1.375): book titles under covers and names on person cards. The original title follows in Literata italic at 0.875rem in Ink Muted.
- **Figure** (400, 2.25rem, tabular): the stats row, the reader average (1.5rem) and score digits. Numbers are Literata, and every `dd` and `time` is tabular.
- **Reading** (400, 1.0625rem, line-height 1.625): long-form taqriz text and the bilingual excerpt.
- **Body** (Onest 400, 0.875rem, line-height 1.625): descriptions, review bodies (15px), lead lines. The hero subline is 1rem → 1.125rem in Ink Muted, max-width 36rem.
- **UI** (Onest 500, 0.875rem): buttons, see-all links, the locale switcher, pagination and the bot hand-off.
- **Wordmark** (Onest 700, 1.125rem, -0.025em): "Kitoblarim" in the lockup, matching the landing's `.word`.
- **Caption** (Onest 400, 0.75rem): meta lines (publisher · year), counts, breadcrumbs and chip text.
- **Label** (Onest 600, 0.6875rem, 0.05em, uppercase): field labels that name a value directly below them (MUALLIF, TARJIMON, NASHRIYOT, NASHR YILI).
- **Label, spaced** (Onest 500, 0.75rem, 0.2em, uppercase): stats-row labels, section counts and the author line under a shelf cover.

### Named Rules
**The Titles Are Books Rule.** Literata is used for book titles, people's and publishers' names, headings and figures. Onest is used for every control, label and line of interface text. If a reader can click or type into it, it is Onest.

**The Okina Rule.** Literata draws the Uzbek ʻ (U+02BB) with zero width. The serif stack always starts with "Literata Okina", a 1 KB face that serves Literata's own ‘ for that one code point. Uzbek text is written with U+02BB (Oʻzbek), not an ASCII apostrophe.

## Layout

There is a single centred column of max 72rem (`max-w-content`) with side gutters of 24px, 32px from 640px and 48px from 1024px. Sections stack vertically at 64px (80px from 640px), and alternate between Bone Paper and white bands with hairline borders on the home page. Section heads sit on a hairline (16px below, 32px gap to content), with the see-all link right-aligned on the baseline.

Grids are plain CSS grids:
- Shelf rows: 2 columns → 4 at 640px → 8 at 1024px on the home page; 2 → 3 → 4 → 5 on the full list. Gaps are 20px across and 40px down.
- Person and publisher cards: 1 → 2 → 3 or 4 columns with 16px gaps.
- The book page: a 12-column split from 1024px (cover in 5 columns, details in 7, 56px gap). It stacks on phones with the cover centred at max 24rem.

The header is sticky, 14px top and bottom. The stats row is one plate split into 2 × 2 cells on phones and 4 cells from 640px.

## Elevation & Depth

The catalogue is flat at rest. Depth comes from white plates on paper and Paper Line hairlines, not from shadow. Shadows appear in three places only. Book covers carry a small resting shadow because they are physical objects. A shadow grows under anything that responds to hover. The one floating surface, the locale menu, has its own ink-tinted shadow. The sticky header separates with a hairline and a 90% paper with backdrop blur, not a shadow.

### Shadow Vocabulary
- **Cover rest** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`, Tailwind `shadow-sm`): shelf covers and edition thumbnails, always with a 1px Paper Line ring.
- **Lift** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`, `shadow-md`): a hovered cover or card.
- **Hero cover** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`, `shadow-xl`, with a 1px ring of Ink at 10%): the single large cover on a book page.
- **Menu** (`box-shadow: 0 12px 32px -12px rgba(20,26,22,0.28), 0 2px 6px rgba(20,26,22,0.06)`): the open locale menu, the only borderless floating plate.

### Named Rules
**The Off The Shelf Rule.** A shelf cover rises 4px and its shadow deepens from Cover rest to Lift on hover and on touch (`:active`), over 300ms on the brand curve. With reduced motion it stays put. This is the bot's own gesture, and it is the catalogue's one piece of physical motion.

**The Flat Plate Rule.** Cards are flat at rest with a Paper Line border. On hover the border turns Fern Line and a shadow appears. Shadow is a response, never decoration.

## Shapes

Corners scale with the size and role of the object. Shelf covers are 2px, almost square like a real book. Thumbnails are 4px. Small tags on covers are 6px. Controls (buttons, the search field, the locale switcher, pagination) are 8px. Person and edition cards, the bot hand-off, the hero cover and the locale menu are 12px. Content plates (person and publisher cards, reviews, taqriz cards, the stats grid, the details and excerpt plates) are 16px. Everything that is a tag or a portrait is a pill or a circle: category chips, language pairs, score badges and avatars. The mark tile rounds at 22.5% of its side (7.2px at 32px), exactly as the bot's app icon.

Borders are always 1px. The landing page's shape rule (plates 22px, cores 16px, controls 10–12px, tags as pills) is the same idea at a larger scale. The catalogue kept its own smaller steps when it was re-skinned, and the build is the record.

## Components

### Buttons
Few and firm. The catalogue has one filled button.
- **Shape:** gently rounded (8px).
- **Primary:** Deep Forest Green with white UI text, 8px × 16px. It is the search submit beside the field.
- **Hover / Focus:** turns Forest Press. Focus is the global ring: 2px Deep Forest Green outline at 3px offset with 6px radius, on every focusable element.
- **Quiet controls:** the locale switcher and pagination arrows are text in Ink Soft that gain a Paper Shade plate and Ink text on hover. The current page is a 36px Deep Forest Green square with white text.

### Chips
- **Category chip:** a pill with a Paper Rule border, Ink Soft caption text, 4px × 12px. On hover the border turns Sage Light (and the text Forest Press on book pages).
- **Active category:** filled Deep Forest Green, white text.
- **Language pair:** a pill on Bone Paper with a Paper Line border, Ink Strong text and a small arrow between the two languages.
- **Score badge:** a Forest Wash pill with a Fern Border, a Literata score in Forest Night and "/10" in Forest Steady at 70%. It comes in three sizes (sm, md, lg). A null score renders nothing.

### Cards / Containers
- **Corner Style:** 16px for content plates, 12px for person cards.
- **Background:** white on Bone Paper. The details and excerpt plates are the exception: Bone Paper at 70–80% with a Paper Line border, a recessed plate rather than a raised one.
- **Shadow Strategy:** flat at rest, Lift on hover (see Elevation).
- **Border:** 1px Paper Line, turning Fern Line on hover for linked cards.
- **Internal Padding:** 20px (content cards), 16px (person and edition cards), 24px (details plate), 24px → 40px (excerpt).
- **Linked card behaviour:** the name inside turns Forest Press on hover. A trailing "view" link in Deep Forest Green nudges its arrow 2px right.

### Inputs / Fields
- **Style:** white field, 1px Paper Rule border, 8px radius, 8px × 12px, body text in Ink, placeholder in Ink Quiet.
- **Focus:** the border shifts to Sage (`forest-500`) with no outline glow. It is a plain GET form, so it works without JavaScript.

### Navigation
- **Header lockup:** the 32px mark tile, the wordmark "Kitoblarim", a 1px × 16px Paper Rule divider, then the section word ("katalog" / "каталог" / "catalogue") in UI weight, Ink Muted. On hover the tile tips −3°. The header is sticky, Bone Paper at 90% with backdrop blur, and has a Paper Line bottom edge.
- **Locale switcher:** a `<details>` disclosure showing a globe, the current language by its own name (Oʻzbekcha, Русский, English) and a chevron that turns 180° when open. The menu is a 176px white plate with the Menu shadow and 6px padding. The active language is Deep Forest Green with a check, and the others are Ink Strong with a Paper Shade hover.
- **Breadcrumbs and back:** caption-size Ink Quiet links that darken on hover, separated by slashes. The back link carries a left arrow.
- **Footer:** centred on Bone Paper. It holds a Literata italic quote, one line with the bot link (underlined in Paper Rule, turning Forest Press on hover) and the copyright.

### Book Card (signature)
The shelf. A 2:3 cover with 2px corners, Paper Shade placeholder, a Paper Line ring and Cover rest shadow. It lifts off the shelf on hover and touch. A 6px role tag ("Badiiy tarjima") sits 10px in from the top-left on 90% white. Below the cover, 16px down: the title (Literata, 1.125rem), the original title (Literata italic, Ink Muted), the author in the spaced label in Ink Quiet, then publisher · year as a caption. A cover with no image shows its title centred in Literata on the placeholder.

### Bot Hand-off (signature)
The catalogue's handshake with the bot, on every book page directly under the details plate. It shows the 24px mark tile, the line "Bu kitobni Telegramda oxirigacha oʻqing" in UI weight Deep Forest Green, and a trailing arrow. At rest there is no plate. On hover a Forest Mist 12px plate appears behind it and the arrow moves 2px right. It links `t.me/kitob_javonim_bot?start=plan_<ISBN>_reads`. On a book with reader ratings or reviews, a second quieter version ("rate it in the bot") closes the readers' section as an underlined Ink Muted link.

### Reader Reviews
Readers' ratings sit apart from editors' taqrizlar. The section opens with a Literata heading, a one-line lead and, on the right, the average beside one Star Gold star with the count in caption below. Each review is a white 16px plate: the reader's first name in UI weight, five 14px stars (filled Star Gold, empty Paper Rule), the body in 15px Ink Strong and a long-form date in caption. The section does not render when there are no ratings and no reviews.

### Share Cards
Open Graph images (1200 × 630) use the same world. They have a Bone Paper ground, 72px × 80px padding, the lockup at 64px with the section word, a Literata 600 title (76–84px, −1.5 to −2px tracking), a supporting line in Onest and a footer row above a Paper Line rule. The footer pairs a line in Deep Forest Green (the promise) or Ink with the host in a muted ink. Onest is drawn at 400/600/700 and Literata at 600, from .woff files covering Latin, Latin Extended and Cyrillic.

## Do's and Don'ts

### Do:
- **Do** use the `forest` scale for anything a reader can act on, with Deep Forest Green (`forest-700`) at rest and Forest Press (`forest-800`) on hover.
- **Do** set titles, names, headings and figures in Literata through `font-serif`, so the "Literata Okina" face is always first in the stack.
- **Do** write Uzbek with ʻ (U+02BB) in every new string.
- **Do** keep text at Ink Quiet (`400`) or darker. Paper Rule (`300`) is for lines and empty icons only.
- **Do** draw the mark with `BrandMark` (paths from the bot's `public/brand/app-icon.svg`) at 32px in the header and 24px beside the hand-off.
- **Do** use the brand curve `cubic-bezier(.32,.72,0,1)`, which is Tailwind's default and `ease-out` here, and honour `prefers-reduced-motion`.
- **Do** keep covers at 2:3 with a Paper Line ring, and let shelf covers lift 4px on hover and touch.

### Don't:
- **Don't** introduce a second accent. Keep amber-on-stone, Tailwind's default grays and emerald out of new work.
- **Don't** use Star Gold for anything except readers' star ratings, and never as text colour.
- **Don't** put a kicker above the hero headline or a decorative gradient behind it. The hero is a Literata headline on paper.
- **Don't** set the bot hand-off as a filled banner or ad. It is a quiet green line with the mark, placed where a reader has just judged a book.
- **Don't** redraw, recolour or re-letter the mark, and don't add a second name beside "Kitoblarim" other than the muted section word.
