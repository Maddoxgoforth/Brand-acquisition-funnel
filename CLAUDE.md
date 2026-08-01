# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## What this is

A single-page marketing/funnel site for **Maddox** — a 1-on-1 mentorship offer
that teaches teens/young adults to sell AI digital products. It's a long
vertical scroll of sections (hero → social proof → results → pitch → mentor
bio → objection handling → FAQ → footer), ending in a repeated "Apply Now"
CTA that's meant to open an application flow (Typeform) after a video sales
letter (VSL).

It is built to be deployed on Vercel (see `AGENTS.md` — the Next.js version
in this repo is newer than most training data; consult
`node_modules/next/dist/docs/` before assuming an API).

Original reference design: a live Vercel deployment the site owner shared as
screenshots (mobile Chrome captures). The VSL and Typeform embeds are
**intentionally placeholder boxes** (`[ VSL EMBED ]`, `[ TYPEFORM EMBED ]`) —
that matches the reference site's current state, not an oversight. Swap in
real embed code only if asked.

The results/mentor proof images (Shopify dashboards, DM screenshot, TikTok
profile, mentor headshot), however, are **real cropped screenshots** the
site owner provided, stored in `public/images/` and rendered via
`next/image`. There used to be a `src/components/mocks/` folder with
hand-built CSS/SVG recreations of this UI as a stand-in before the real
screenshots existed — that folder is gone now that real assets are wired
in; don't recreate it unless a new proof point needs a mock before its real
screenshot is available.

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript
- **Tailwind CSS v4** (CSS-first config via `@theme inline` in
  `src/app/globals.css` — there is no `tailwind.config.ts`)
- No database, no API routes, no auth — this is a static marketing page.
- Font: `next/font/google` Geist, loaded once in `src/app/layout.tsx`.

## Dev workflow

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build; also runs the TypeScript check
npm run lint    # eslint (flat config in eslint.config.mjs)
```

There is no test suite. Before calling a change done:
1. `npm run lint` and `npm run build` must pass cleanly.
2. For anything visual, run `npm run dev` and actually look at the page
   (desktop **and** narrow/mobile width — this design is mobile-first and the
   whole page lives inside one centered `max-w-xl` column even on desktop).
3. If you touch `Faq.tsx`, verify the accordion still opens/closes — it's the
   only stateful interaction on the page.

## Structure and conventions

```
src/app/
  layout.tsx        # root layout: font, <html>/<body>, metadata
  globals.css        # Tailwind import + design tokens (@theme inline)
  page.tsx            # composes the page: one <SectionComponent /> per section, in scroll order
src/components/
  ui/                 # generic, content-agnostic primitives
  sections/           # one file per page section, matches page.tsx order
public/images/         # real proof screenshots (Shopify dashboards, DM
                        # thread, TikTok profile, mentor headshot), cropped
                        # tight and rendered via next/image in Results.tsx
                        # and Mentor.tsx
```

- **Sections are Server Components by default.** Only `Faq.tsx` has
  `"use client"` (it needs `useState` for the accordion). Keep new
  interactive bits scoped to the smallest client component possible rather
  than marking a whole section client-side.
- **Section anatomy**: every section is `<section className="py-16"><Container>...</Container></section>`.
  Reuse `Container` for the centered column instead of repeating `mx-auto max-w-xl px-6`.
  Repeated visual motifs to reuse instead of re-implementing:
  - `Pill` — small rounded badge (blue dot + text), used in the hero.
  - `CtaButton` — the "APPLY NOW / Book your intro call" button + italic
    "No experience needed. Just action." subtext. It appears after the
    results, blueprint, and comparison sections — always via this component,
    never hand-rolled, so copy/style stays in sync.
  - `Card` — bordered, rounded, dark "elevated" panel background.
  - `EmbedPlaceholder` — the bracketed `[ LABEL ]` placeholder box style.
  - `SectionHeading` — eyebrow + title + optional subtitle, centered.
- **Copy is hardcoded** in the section components (this is a single fixed
  offer page, not a CMS-driven site). FAQ entries live as a `FAQS` array at
  the top of `Faq.tsx`; comparison list items are `WITH_MADDOX` /
  `WITHOUT_MADDOX` arrays in `Comparison.tsx`. Edit those arrays rather than
  the JSX when changing text.
- Everything routes through the `@/*` import alias (`src/*`), configured in
  `tsconfig.json`.

## Design tokens (`src/app/globals.css`)

Dark theme only — no light-mode media query, no toggle. Custom tokens are
exposed as Tailwind colors via `@theme inline`:

| Token | Hex | Use |
|---|---|---|
| `background` | `#05060f` | page background |
| `background-elevated` | `#0a0c1a` | cards, embed placeholders, pills |
| `foreground` | `#f5f6fa` | primary text |
| `muted` | `#9aa0b4` | secondary text |
| `accent` | `#3d5afe` | brand blue — links, highlighted words, CTA, chart lines |
| `accent-dim` | `#2a3ecf` | CTA hover state |
| `danger` | `#e5484d` | the "X" / most-people-fail-because list |
| `border` | `#22243a` | card/panel borders |

Use these via Tailwind classes (`bg-background-elevated`, `text-accent`,
`border-border`, etc.) instead of introducing new raw hex values. The real
proof screenshots in `public/images/` (white Shopify-admin chrome, black
iMessage/TikTok chrome) intentionally break this palette because they're
photos of a *different* UI — that's expected, don't try to recolor them.

## Content/behavior notes worth knowing before editing

- The three "Apply Now" buttons and the hero's Typeform placeholder all link
  to the same in-page anchor (`#apply`, set on the hero's
  `EmbedPlaceholder`). If you replace the Typeform placeholder with a real
  embed, keep that `id="apply"` (or update every `CtaButton` href to match).
- Numbers throughout ($20k/mo, 300K+, $102,988, 224K sessions, 290K+
  followers, etc.) are specific claims from the real reference page — don't
  round or "clean up" them without being asked, they're presumably accurate
  to the offer.
- The result-card and mentor images are cropped screenshots (status bars /
  app chrome removed, see `public/images/`), not generated graphics — if a
  new proof point comes in, crop it the same way (tight to the content,
  no phone status bar) rather than adding a new CSS/SVG recreation.

## What's intentionally not built yet

- Real VSL video and Typeform application embeds (placeholders by design —
  see above).
- `/privacy` and `/terms` — footer links currently point to `#`.
- No analytics/pixel wiring (Meta/TikTok pixels etc.) — ask before adding
  third-party tracking scripts, since that's a product/legal decision, not a
  styling one.
