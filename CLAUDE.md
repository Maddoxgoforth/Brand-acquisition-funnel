# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## What this is

A marketing/funnel site for **Maddox** — a 1-on-1 mentorship offer that
teaches teens/young adults to sell AI digital products. It has two pages:

- **`/` (the funnel)** — a long vertical scroll of sections (hero → social
  proof → results → pitch → mentor bio → objection handling → FAQ →
  footer), ending in a repeated "Apply Now" CTA that opens an inline
  Typeform application after a Wistia video sales letter (VSL).
- **`/thank-you`** — the page qualified applicants land on after booking a
  call. It's a self-contained "watch these before your call" page: one main
  welcome/congrats video (`WelcomeVideo`), then five question-and-answer
  breakdown videos (`ObjectionVideos` — each answers a specific question the
  site owner supplies, framed as an FAQ rather than "limiting beliefs" even
  though that's the underlying intent), then more client results
  (`MoreResults`). Same theme/components as `/`.
- **`/content-audit`** — a standalone lead-gen quiz funnel, unrelated to the
  Typeform/Cal.com flow above. Visitors answer a 9-question quiz
  (`src/components/content-audit/Quiz.tsx`, questions defined in
  `questions.ts` — niche and goal are open-ended textareas for specificity,
  the rest are quick-tap selects); question 5 collects name/email/phone. On
  the final answer it POSTs to `src/app/api/content-audit/route.ts`, which
  calls OpenAI to generate a personalized "game plan" (niche + content ideas
  + 3 high-ticket product ideas, schema-validated with Zod) and pushes the
  lead + that generated content into ConvertKit (Kit) as subscriber custom
  fields, subscribing them to a form that triggers the site owner's own
  email automation. The result renders directly on the page
  (`GamePlanResult.tsx`) so the visitor sees it immediately, not just via
  email, followed by a link to `/content-audit/hooks` (a free "100+ viral
  hook templates" download page — the real PDF, `public/downloads/viral-hooks.pdf`,
  with a short text preview of the first few hooks pulled from that file
  and a real download link), a "Real Client Results" section with real
  testimonial screenshots (two Shopify sales dashboards, plus a before/after
  pair of the same creator's TikTok view counts — `public/images/testimonial-*`),
  and a final CTA back to `/` (the top of the main funnel, where the VSL
  is — deliberately not `/#apply`, so visitors watch the VSL instead of
  jumping straight to the Typeform). A `RecentActivityToast` client
  component also mounts on this page only: every 45-90s (randomized) it
  slides in a "[First name] [Last name] just got their free content audit"
  notice at the top of the viewport for 5s, then hides. Names are a
  hardcoded random pool (`FIRST_NAMES`/`LAST_NAMES` in
  `RecentActivityToast.tsx`), not real signups — purely a social-proof
  FOMO widget, same pattern as tools like Fomo/Proof. See "Content-audit
  setup" below for what has to be configured outside this repo before the
  quiz itself works.

It is built to be deployed on Vercel (see `AGENTS.md` — the Next.js version
in this repo is newer than most training data; consult
`node_modules/next/dist/docs/` before assuming an API).

Original reference design: a live Vercel deployment the site owner shared as
screenshots (mobile Chrome captures). Every video on the site is a real
Wistia embed via the shared `WistiaEmbed` component (`src/components/ui/WistiaEmbed.tsx`,
takes a `mediaId` prop): the `/` VSL (`p3h2xpk8hb`), the `/thank-you` welcome
video (`ynkriiuux3`), and its five question-breakdown videos (see the
`QUESTIONS` array in `ObjectionVideos.tsx` for the question text → media id
mapping). The `/` application form is a real inline Typeform
(`TypeformEmbed`, form id `zKqvPAGW`) — see "Conversion flow" below for how a
visitor moves from `/` through Typeform, to Cal.com, to `/thank-you`.

The results/mentor proof images on all three pages (Shopify dashboards, DM
screenshot, TikTok profile, mentor headshot, `/thank-you`'s JJVending
dashboard and Derek's 4 TikTok clips, `/content-audit`'s three
`testimonial-*` results cards) are **real cropped screenshots** the
site owner provided, stored in `public/images/` and rendered via
`next/image`. There used to be a `src/components/mocks/` folder with
hand-built CSS/SVG recreations of this UI as a stand-in before the real
screenshots existed — that folder is gone now that real assets are wired
in; don't recreate it unless a new proof point needs a mock before its real
screenshot is available.

## Conversion flow

1. Visitor lands on `/`, watches the VSL, fills out the inline Typeform.
2. Typeform's own logic (configured in the site owner's Typeform account,
   not in this codebase) redirects qualified respondents to the owner's
   Cal.com booking link.
3. After booking, Cal.com needs to redirect to `/thank-you` on this site.
   That redirect is a Cal.com **Event Type → Advanced → "Redirect on
   booking"** setting in the owner's Cal.com dashboard — also not something
   this codebase controls. If `/thank-you` ever moves or the domain changes,
   that Cal.com setting needs updating too.
4. `/thank-you` plays a few objection-breakdown videos and shows more
   results while they wait for the call.

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript
- **Tailwind CSS v4** (CSS-first config via `@theme inline` in
  `src/app/globals.css` — there is no `tailwind.config.ts`)
- No database, no auth. `/` and `/thank-you` are fully static. `/content-audit`
  is the one exception: it has a real server-side API route
  (`/api/content-audit`) that calls OpenAI and ConvertKit — see
  "Content-audit setup" below.
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
  layout.tsx              # root layout: font, <html>/<body>, metadata (applies to every route)
  globals.css             # Tailwind import + design tokens (@theme inline) + the
                          # wistia-player :not(:defined) placeholder rule
  page.tsx                 # the funnel ("/"): one <SectionComponent /> per section, in scroll order
  thank-you/page.tsx        # the post-booking page ("/thank-you"), same pattern
  content-audit/page.tsx    # the lead-gen quiz page ("/content-audit")
  content-audit/hooks/page.tsx # free "100+ viral hook templates" download page
  api/content-audit/route.ts # POST handler: OpenAI game-plan generation + ConvertKit upsert
src/components/
  ui/                     # generic, content-agnostic primitives
  sections/               # one file per page section; funnel and thank-you
                          # sections both live here, matching their page.tsx order
  content-audit/          # Quiz.tsx, questions.ts, GamePlanResult.tsx — scoped to
                          # /content-audit only, not shared with the rest of the site
src/types/wistia.d.ts      # JSX.IntrinsicElements augmentation for <wistia-player>
public/images/             # real proof screenshots (Shopify dashboards, DM
                            # thread, TikTok profile, mentor headshot,
                            # content-audit testimonial-* cards), cropped
                            # tight and rendered via next/image
public/downloads/          # real downloadable lead-magnet files, e.g.
                            # viral-hooks.pdf served from /content-audit/hooks
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

- The three "Apply Now" buttons on `/` and the hero's `TypeformEmbed` all
  target the same in-page anchor (`#apply`, set as the `id` on the
  `TypeformEmbed` wrapper div in `Hero.tsx`). If you change how the Typeform
  is embedded, keep that `id="apply"` (or update every `CtaButton` href to
  match).
- Numbers throughout ($20k/mo, 300K+, $102,988, 224K sessions, 290K+
  followers, etc.) are specific claims from the real reference page — don't
  round or "clean up" them without being asked, they're presumably accurate
  to the offer.
- The result-card and mentor images are cropped screenshots (status bars /
  app chrome removed, see `public/images/`), not generated graphics — if a
  new proof point comes in, crop it the same way (tight to the content,
  no phone status bar) rather than adding a new CSS/SVG recreation.
- The Wistia (`WistiaEmbed`) and Typeform (`TypeformEmbed`) embeds both make
  outbound requests to third-party domains (`fast.wistia.com`,
  `form.typeform.com`) — they won't render in network-sandboxed dev
  environments. A clean `npm run build` with no console errors is the
  correct way to verify them there; don't conclude they're broken just
  because a sandboxed screenshot shows an empty box.
- Every `wistia-player[media-id="..."]:not(:defined)` blur-placeholder CSS
  rule in `globals.css` is per-media-id (Wistia's own snippet ties the
  poster-swatch URL to that specific id) — adding a new video means adding
  its own rule there, not reusing an existing one.

## Content-audit setup

`/content-audit` won't actually send anything until these exist. See
`.env.example` for the variable names.

1. **OpenAI**: create an API key at platform.openai.com and set
   `OPENAI_API_KEY`. The route defaults to `gpt-4o-mini` — verify that's
   still a current, available model before relying on it long-term (model
   names/availability change over time; override with `OPENAI_MODEL` if
   not).
2. **ConvertKit (Kit)**: create an API key (Account Settings → Developer)
   and set `CONVERTKIT_API_KEY`.
3. In Kit's dashboard, create **custom fields** with exactly these slugs
   (unknown field keys are silently dropped by their API, and renaming a
   slug later breaks any email template merge tags built on the old name):
   `phone_number`, `niche`, `video_ideas`, `product_ideas`.
4. Create a **Form** in Kit for this funnel, set `CONVERTKIT_FORM_ID` to its
   numeric ID, and build an **automation/sequence** triggered by that form
   with the actual game-plan email. That email template is built in Kit's
   own editor, not in this codebase — use Liquid merge tags to pull in the
   generated content. Use the **flat** form, not `subscriber.custom_fields.X`
   — the nested form is what Kit's own docs/support suggest, but in practice
   it does not resolve in Visual Automation emails even when the field has
   real data (confirmed by testing: `{{ subscriber.first_name }}` rendered,
   `{{ subscriber.custom_fields.niche }}` rendered as empty on the same send).
   The flat form works:
   ```
   Your niche: {{ subscriber.niche }}
   Video ideas: {{ subscriber.video_ideas }}
   Product ideas: {{ subscriber.product_ideas }}
   ```
5. Set all four env vars in Vercel's project settings for production, and in
   a local `.env.local` (gitignored) for `npm run dev`.

The ConvertKit API details here (`https://api.kit.com/v4`, `X-Kit-Api-Key`
header, `/subscribers` then `/forms/{id}/subscribers`) came from research
that couldn't load Kit's docs directly (network-blocked) and reconstructed
them from search results instead — internally consistent, but do one live
test end-to-end before treating this as fully verified.

## What's intentionally not built yet

- `/privacy` and `/terms` — footer links currently point to `#`.
- No analytics/pixel wiring (Meta/TikTok pixels etc.) — ask before adding
  third-party tracking scripts, since that's a product/legal decision, not a
  styling one.
- The Typeform → Cal.com and Cal.com → `/thank-you` redirects live in the
  site owner's Typeform/Cal.com dashboards, not in this codebase (see
  "Conversion flow" above) — there's nothing to "fix" here if that hand-off
  breaks, it's a config check on those platforms.
