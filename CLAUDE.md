# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## What this is

A marketing/funnel site for **Maddox** — a 1-on-1 mentorship offer that
teaches teens/young adults to sell digital products using AI. (Maddox sells
digital products and uses AI as a tool in that business — he does not sell
"AI products" — keep that distinction in any new copy, with one explicit
exception: `/` (the free-course landing page) deliberately uses the
simplified term "AI digital products" throughout, per the site owner's
explicit request for that page specifically. Don't carry that simplified
term over to any other page without being told to.)

**Routing note:** `/` and `/apply` swapped roles from how this site originally
shipped. The free-course landing page (described right below) is now the
site's root/homepage — it's what `brandacquisition.co` shows. The original
long-form application funnel (VSL → Typeform → Cal.com) now lives at
`/apply` instead of `/`. The old `/free-course` URL permanently redirects to
`/` (see `next.config.ts`'s `redirects()`), so any existing ads/link-in-bio
traffic pointed at `/free-course` still lands correctly. If you're searching
this file for "the funnel" or "the VSL that leads to Typeform," that's now
`/apply`, not `/`.

- **`/` (the free-course landing page)** — see the `/free-course` bullet
  below for the full page breakdown; everything described there lives here
  now, just at the root path instead of `/free-course`.
- **`/apply` (the application funnel)** — a long vertical scroll of sections
  (hero → social proof → results → pitch → mentor bio → objection handling →
  FAQ → footer), ending in a repeated "Apply Now" CTA that opens an inline
  Typeform application after a Wistia video sales letter (VSL). This is the
  page that used to live at `/`.
- **`/thank-you`** — the page qualified applicants land on after booking a
  call for the **high-ticket** offer. It's a self-contained "watch these
  before your call" page: one main welcome/congrats video (`WelcomeVideo`),
  then five question-and-answer breakdown videos (`ObjectionVideos` — each
  answers a specific question the site owner supplies, framed as an FAQ
  rather than "limiting beliefs" even though that's the underlying intent),
  then more client results (`MoreResults`). Same theme/components as `/apply`.
- **`/thank-you-mid`** — the same post-booking page, but for applicants who
  book the **mid-ticket** offer instead. Identical layout/copy to
  `/thank-you` (same `ThankYouHero` and `MoreResults`, reused directly), but
  with its own `WelcomeVideoMid`/`ObjectionVideosMid` sections and their own
  real Wistia recordings, since the mid-ticket offer needed its own videos.
  Note the mid-ticket FAQ set is **six** questions (not five like
  `/thank-you`) and the wording differs slightly — see the `QUESTIONS` array
  in `ObjectionVideosMid.tsx` for the question text → media id mapping.
  Which page a given applicant lands on is decided by which Cal.com event
  type they booked (see "Conversion flow" below) — not by anything in this
  codebase.
- **`/offer`** — a self-contained sales page for the **low-ticket** offer
  ($50/month), which respondents land on directly from Typeform (no Cal.com
  call for this tier — it's a self-serve purchase). Structured like a
  classic long-form VSL sales page: hero with a "Watch This Video Now"
  eyebrow over a real Wistia VSL embed (`OfferHero`, media id
  `as0pb8rxza`), a `$50/Month` price label (the Whop embed below has
  `data-whop-checkout-hide-price="true"`, so nothing else on the page
  states the price), then the real Whop checkout embedded inline
  (`WhopCheckoutEmbed`, plan id `plan_LYj5o1sOR9YRW` — loads Whop's
  `js.whop.com/static/checkout/loader.js` and renders their widget
  directly in the page, id="checkout" on the
  wrapper), an "Everything Inside The Membership" bullet list
  (`OfferPitch`), a long stack of real proof reusing every dashboard/DM/
  view-count screenshot already on the site (`OfferResults`), an
  authority/credibility section reusing Maddox's real TikTok profile and
  headshot but with copy specific to the membership (`OfferAuthority` —
  deliberately not a reuse of the homepage's `Mentor.tsx`, since that
  component's copy pitches 1-on-1 coaching, which this $50/mo tier does
  not include), and a closing push (`OfferClose`). A `CtaButton` repeats
  after every section to keep a buy CTA within reach while scrolling —
  each one has deliberately different label/subtext copy ("CLAIM YOUR
  SPOT", "START YOUR OWN RESULTS", "BE THE NEXT SUCCESS STORY", etc.)
  rather than repeating the same line down the page. Only the hero has the
  actual embedded checkout; every other buy button is an `href="#checkout"`
  anchor link that scrolls up to it — same pattern as the homepage's
  `CtaButton`s all pointing at `#apply` on the embedded Typeform.
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
  and a final CTA back to `/apply` (the top of the application funnel,
  where the VSL is — deliberately not `/apply#apply`, so visitors watch the
  VSL instead of jumping straight to the Typeform). A `RecentActivityToast` client
  component also mounts on this page only: every 45-90s (randomized) it
  slides in a "[First name] [Last name] just got their free content audit"
  notice at the top of the viewport for 5s, then hides. Names are a
  hardcoded random pool (`FIRST_NAMES`/`LAST_NAMES` in
  `RecentActivityToast.tsx`), not real signups — purely a social-proof
  FOMO widget, same pattern as tools like Fomo/Proof. See "Content-audit
  setup" below for what has to be configured outside this repo before the
  quiz itself works.
- **`/free-course` (now `/`, see the routing note above)** — a separate,
  self-contained long-form landing page for
  a free-course giveaway tied to a paid partnership with **Base44**
  (an AI app builder — Base44 compensates the site owner for driving
  people to it; see the disclosure text in `FreeCourseClose.tsx`). Not part
  of the Typeform/Cal.com funnel at all — it's a standalone acquisition page,
  reached via ads/link-in-bio, following the same long-form structure as a
  reference page the site owner modeled it on (hero → what's included →
  "how is this free" → why-the-skill-matters grid → 3-step system →  module
  grid → tools list → 3-step access → results/testimonials → FAQ → final
  offer card), with copy rewritten around personal branding + selling
  "AI digital products" (see the note in "What this is" above about how
  this simplified term differs from the rest of the site's positioning).
  Every CTA on the page is a `FreeCourseCta`
  button (`src/components/ui/FreeCourseCta.tsx`, a client component), never
  a plain link — clicking any of them opens the same modal with a
  name/email/phone form (with a required consent checkbox), not a Typeform.
  On submit it POSTs to `/api/free-course-lead`
  (`src/app/api/free-course-lead/route.ts`), which validates the fields and
  forwards the lead directly to a **Discord webhook** as an embed — see
  "Free-course lead setup" below for how to configure that. The VSL is a
  real Wistia embed (`WistiaEmbed`, media id `mmgcz1a9lr`, `aspect={0.5625}`
  since the real video is portrait, not landscape — see `WistiaEmbed`'s
  optional `aspect` prop, added for exactly this; every other real video on
  the site keeps the default 16:9). Every other video on this page is still
  an `EmbedPlaceholder` (`src/components/ui/EmbedPlaceholder.tsx`, supports
  `"video"` / `"square"` / `"vertical"` aspect ratios) since no other real
  Wistia recordings exist for this page yet. The results section reuses real proof
  images already on the site rather than fabricating new testimonial
  screenshots for this page. The $4,000 course-value figure used throughout
  this page is the real Creator Blueprint high-ticket price; don't change
  it without being asked.
- **`/free-course/build`** — a bonus tutorial page for students who are
  already in the free course, not linked from the main site nav or any CTA;
  the site owner shares this URL manually once someone opts in. It's a
  step-by-step, copy-paste workshop ("Creator OS, the Workshop Edition")
  that walks the student through building their own Base44 app: a genuine
  life-operating-system dashboard with six rooms (Money, Health, Calendar,
  Goals, Habits, Why — not narrowed to just content/business tracking),
  plus a Base44 Superagent that texts them morning and evening and logs
  their answers back into the dashboard. The site owner's own business
  model (selling digital products with AI) is only plugged in where the
  build generically referenced "this business" — the Calendar room's daily
  work block — everything else (Money, Health, Habits, Why) stays general
  life-tracking so the tool is useful daily regardless of where someone is
  in building their business. Built-in retention mechanics worth knowing
  about if you touch this file: a single 0-100 "Momentum Score" blending
  streak/goal/habit progress into one daily number, a tracked best-streak-
  ever record, an 8pm evening nudge text if the morning check-in was
  missed, and streak-milestone texts (7/30/60/90 days or a new personal
  best) — these are the two explicit exceptions to the "no automatic
  summaries" rule baked into the foundation paste itself. Each step is a
  `Card` containing one or more `CopyBlock`s (`src/components/ui/CopyBlock.tsx`,
  a client component with a copy-to-clipboard button) holding the exact
  prompt text to paste into Base44 — the prompts themselves are hardcoded
  in a `STEPS` array in `CreatorOsSteps.tsx`, matching the project's "copy
  lives in arrays" convention. This exists because Base44 reviews partner
  activation/retention (see the Base44 partnership playbook discussed when
  this page was built): a tangible, repeatedly-used build drives both far
  better than handing someone a login and a video library.
- **`/free-course/confirmation`** — the page a visitor is meant to land on
  immediately after submitting the `FreeCourseCta` lead form, built but
  **not wired up yet**: nothing in the codebase currently redirects there
  (`FreeCourseCta.tsx`'s modal still just shows its inline "you're in"
  success message). The site owner is intentionally holding off connecting
  it until the real confirmation VSL is recorded and uploaded. Don't add
  that redirect, and don't link this page from anywhere else, unless
  explicitly asked — when that happens, the natural place to wire it in is
  `FreeCourseCta.tsx`'s `status === "success"` branch, replacing the inline
  message with a `redirect`/`router.push` to this route once a real
  `mediaId` is slotted into `FreeCourseConfirmationHero.tsx`'s
  `EmbedPlaceholder` (currently a placeholder, `aspect="vertical"`, same
  pattern as every other not-yet-recorded video on this site). Structure,
  in page order: `FreeCourseConfirmationHero.tsx` (eyebrow, headline, VSL
  placeholder, then the "we'll call you within 5 minutes" line below the
  video) → `FreeCourseConfirmationNextSteps.tsx` (3 numbered cards: answer
  the call, get set up live, get instant access) → `FreeCoursePitch.tsx`
  (reused as-is from `/` — the "what's included" list plus the $4,000
  struck-through / FREE-in-green price block) →
  `FreeCourseConfirmationPhases.tsx` (7 numbered phase cards: Introduction,
  Mindset, Set Up Your AI Tools, Create Your First Videos, Learn How To
  Create Good Content, Create Your Digital Product, Sell To Your Audience
  And Scale) → `FreeCourseConfirmationHowFree.tsx` ("Wait, How Is This
  Free?" — same Base44-partnership explanation as `FreeCoursePartnership.tsx`
  on `/`, but with no `FreeCourseCta` button, since this page has none) →
  `FreeCourseConfirmationResults.tsx` (every real proof image on the site —
  the full set, matching `/offer`'s `OfferResults.tsx`) →
  `FreeCourseConfirmationClosing.tsx` ("That's it. Now keep your phone
  close. Your coach will call you to set you up while you wait.").

It is built to be deployed on Vercel (see `AGENTS.md` — the Next.js version
in this repo is newer than most training data; consult
`node_modules/next/dist/docs/` before assuming an API).

Original reference design: a live Vercel deployment the site owner shared as
screenshots (mobile Chrome captures). Every video on the site is a real
Wistia embed via the shared `WistiaEmbed` component (`src/components/ui/WistiaEmbed.tsx`,
takes a `mediaId` prop): the `/apply` VSL (`p3h2xpk8hb`), the `/thank-you` welcome
video (`872u3hcmss`), and its five question-breakdown videos (see the
`QUESTIONS` array in `ObjectionVideos.tsx` for the question text → media id
mapping), plus the `/thank-you-mid` welcome video (`hyjp4f2ars`) and its own
six question-breakdown videos (see `ObjectionVideosMid.tsx`), the
`/offer` VSL (`as0pb8rxza`), and the `/` (free-course) VSL (`mmgcz1a9lr`,
portrait). The `/apply`
application form is a real inline Typeform (`TypeformEmbed`, form id
`zKqvPAGW`) — see "Conversion flow" below for how a visitor moves from `/apply`
through Typeform, to Cal.com, to `/thank-you`.

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

1. Visitor lands on `/apply`, watches the VSL, fills out the inline Typeform.
2. Typeform's own logic (configured in the site owner's Typeform account,
   not in this codebase) routes respondents one of three ways: high-ticket
   and mid-ticket qualifiers each get a Cal.com booking link (different
   links per tier); low-ticket qualifiers instead get redirected straight
   to `/offer` — no call to book, since it's a self-serve monthly purchase.
3. After booking, each Cal.com **Event Type** needs its own **Advanced →
   "Redirect on booking"** setting pointing at the matching page on this
   site: the high-ticket event type → `/thank-you`, the mid-ticket event
   type → `/thank-you-mid`. Both are Cal.com dashboard settings, not
   anything this codebase controls. If either page ever moves or the domain
   changes, both Cal.com settings need updating.
4. `/thank-you` (or `/thank-you-mid`) plays a few objection-breakdown
   videos and shows more results while they wait for the call. `/offer`
   instead pitches the $50/mo membership directly with a VSL and repeated
   buy CTAs — see the `/offer` bullet above.

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript
- **Tailwind CSS v4** (CSS-first config via `@theme inline` in
  `src/app/globals.css` — there is no `tailwind.config.ts`)
- No database, no auth. `/`, `/apply`, `/thank-you`, `/thank-you-mid`, and
  `/offer` are fully static. `/content-audit` is the one exception: it has a
  real server-side API route (`/api/content-audit`) that calls OpenAI and
  ConvertKit — see "Content-audit setup" below.
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
  page.tsx                 # the free-course landing page ("/"), the site's root/homepage
  apply/page.tsx            # the application funnel ("/apply"): one <SectionComponent />
                            # per section, in scroll order — this is "the funnel" that used
                            # to live at "/" before the routing swap (see note up top)
  opengraph-image.tsx       # generated share-card image for "/" (Next's file convention)
  thank-you/page.tsx        # the high-ticket post-booking page ("/thank-you"), same pattern
  thank-you-mid/page.tsx    # the mid-ticket post-booking page ("/thank-you-mid") — identical
                            # layout, its own Welcome/Objection video sections with their
                            # own real Wistia recordings (six FAQ videos, not five)
  offer/page.tsx            # the low-ticket ($50/mo) sales page ("/offer")
  content-audit/page.tsx    # the lead-gen quiz page ("/content-audit")
  content-audit/hooks/page.tsx # free "100+ viral hook templates" download page
  api/content-audit/route.ts # POST handler: OpenAI game-plan generation + ConvertKit upsert
src/components/
  ui/                     # generic, content-agnostic primitives
  sections/               # one file per page section; funnel, both thank-you pages, and
                          # /offer's sections (Offer*.tsx) all live here, matching their
                          # page.tsx order
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

White/light-blue theme only — no dark-mode media query, no toggle (this
replaced an earlier all-dark palette; if you see dark hex values referenced
anywhere outside this file, they're stale). Custom tokens are exposed as
Tailwind colors via `@theme inline`:

| Token | Hex | Use |
|---|---|---|
| `background` | `#ffffff` | page background |
| `background-elevated` | `#eff6ff` | cards, embed placeholders, pills |
| `foreground` | `#0f172a` | primary text |
| `muted` | `#64748b` | secondary text |
| `accent` | `#2563eb` | brand blue — links, highlighted words, CTA, chart lines |
| `accent-dim` | `#1d4ed8` | CTA hover state |
| `danger` | `#dc2626` | the "X" / most-people-fail-because list |
| `border` | `#bfdbfe` | card/panel borders |

Use these via Tailwind classes (`bg-background-elevated`, `text-accent`,
`border-border`, etc.) instead of introducing new raw hex values. The real
proof screenshots in `public/images/` (white Shopify-admin chrome, black
iMessage/TikTok chrome) intentionally break this palette because they're
photos of a *different* UI — that's expected, don't try to recolor them.
`Comparison.tsx`'s two panels intentionally use ad-hoc Tailwind colors
(`bg-accent`/`bg-white` for the "with Maddox" panel, `bg-red-50`/`border-red-200`
for the "most people your age" panel) rather than the shared tokens, since
they needed a specific light-red danger tint that isn't one of the tokens
above — don't "fix" those back to token classes.

## Content/behavior notes worth knowing before editing

- The three "Apply Now" buttons on `/apply` and the hero's `TypeformEmbed`
  all target the same in-page anchor (`#apply`, set as the `id` on the
  `TypeformEmbed` wrapper div in `Hero.tsx`). If you change how the Typeform
  is embedded, keep that `id="apply"` (or update every `CtaButton` href to
  match). Note this is a same-page fragment on `/apply` — unrelated to the
  `/apply` route name itself, which is just where that page now lives.
- Numbers throughout ($30k/mo, 300K+, $102,988, 224K sessions, 400K+
  followers, etc.) are specific claims from the real reference page — don't
  round or "clean up" them without being asked, they're presumably accurate
  to the offer. Note: the monthly-income figure in *copy* (Mentor.tsx,
  OfferAuthority.tsx) is $30K/mo (updated from an earlier $20K/mo figure),
  and the follower count in copy is 400K+ (updated from an earlier 290K+
  figure as the account has grown), but the real `tiktok-profile.jpg`
  screenshot itself still shows 290.2K since it's a point-in-time photo —
  its `alt` text intentionally still says 290.2K to accurately describe
  what's actually in that image. Don't
  "fix" that alt text to say 400K; it would misdescribe the screenshot.
  The lifetime-earnings figure in copy is now $250K (updated from an
  earlier $200K figure) — it appears as a headline stat in `Hero.tsx`
  (`/apply`), `OfferHero.tsx` and `OfferClose.tsx` (`/offer`), and as a full
  sentence ("I've made over a quarter million dollars selling this exact
  system myself...") in `FreeCoursePartnership.tsx` (`/`) and
  `FreeCourseConfirmationHowFree.tsx` (`/free-course/confirmation`).
- The result-card and mentor images are cropped screenshots (status bars /
  app chrome removed, see `public/images/`), not generated graphics — if a
  new proof point comes in, crop it the same way (tight to the content,
  no phone status bar) rather than adding a new CSS/SVG recreation.
- The Wistia (`WistiaEmbed`), Typeform (`TypeformEmbed`), and Whop
  (`WhopCheckoutEmbed`) embeds all make outbound requests to third-party
  domains (`fast.wistia.com`, `form.typeform.com`, `js.whop.com`) — they
  won't render in network-sandboxed dev environments. A clean `npm run
  build` with no console errors is the correct way to verify them there;
  don't conclude they're broken just because a sandboxed screenshot shows
  an empty box.
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
5. **Optional — Zapier**: to also notify the team (e.g. in Discord) on every
   submission, create a Zap with trigger **Webhooks by Zapier → Catch Hook**,
   copy its URL into `ZAPIER_CONTENT_AUDIT_WEBHOOK_URL`, and add an action
   step in Zapier (e.g. **Discord → Send Channel Message**) that formats a
   message from the payload fields (`name`, `email`, `phone`, `answers` —
   an object keyed by question id from `questions.ts`, `niche`,
   `video_ideas`, `product_ideas`). This step is entirely optional and
   best-effort: `sendToZapier` in `route.ts` no-ops if the env var is unset,
   and swallows its own errors, so a broken/missing Zap never blocks the
   visitor's game plan or the ConvertKit delivery.
6. Set all env vars in Vercel's project settings for production, and in a
   local `.env.local` (gitignored) for `npm run dev`.

The ConvertKit API details here (`https://api.kit.com/v4`, `X-Kit-Api-Key`
header, `/subscribers` then `/forms/{id}/subscribers`) came from research
that couldn't load Kit's docs directly (network-blocked) and reconstructed
them from search results instead — internally consistent, but do one live
test end-to-end before treating this as fully verified.

## Free-course lead setup

The free-course landing page's (`/`) lead form (opened by every `FreeCourseCta`
button) POSTs to `/api/free-course-lead`, which forwards each lead straight to a Discord
channel — no Zapier, no CRM, just a Discord "Incoming Webhook."

1. In Discord, open the channel you want leads posted to → **Edit Channel**
   → **Integrations** → **Webhooks** → **New Webhook**. Name it something
   like "Free Course Leads" and click **Copy Webhook URL**.
2. Set that URL as `DISCORD_FREE_COURSE_WEBHOOK_URL` — in Vercel's project
   Environment Variables for production, and in `.env.local` for
   `npm run dev`.
3. That's it — no further Discord-side configuration needed. Each
   submission (name, email, phone) arrives as an embed in that channel.

If this env var is unset, the API route still returns success and the
visitor still sees the "you're in" confirmation — it just silently skips
the Discord notification, same best-effort pattern as
`ZAPIER_CONTENT_AUDIT_WEBHOOK_URL` above. There's currently no email/CRM
integration for these leads (no ConvertKit, no Zapier) — just the Discord
notification. If you want these leads to also land somewhere like
ConvertKit, that would need to be added explicitly.

## What's intentionally not built yet

- `/privacy` and `/terms` — footer links currently point to `#`.
- No analytics/pixel wiring (Meta/TikTok pixels etc.) — ask before adding
  third-party tracking scripts, since that's a product/legal decision, not a
  styling one.
- The Typeform → Cal.com and Cal.com → `/thank-you`/`/thank-you-mid`
  redirects live in the site owner's Typeform/Cal.com dashboards, not in
  this codebase (see "Conversion flow" above) — there's nothing to "fix"
  here if that hand-off breaks, it's a config check on those platforms.
