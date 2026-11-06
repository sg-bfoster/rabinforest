# App Store apps on rabinforest — plan

Status: plan only (2026-11-06). Nothing here is built yet.

## Why

Brian now has two apps live on the App Store:

| App | Live since | Listing | Source repo |
|---|---|---|---|
| AskGWINnett (iPhone + iPad) | 2026-10-31 | https://apps.apple.com/us/app/askgwinnett/id6824590924 | `county-app` (Angular 22 + Capacitor) |
| Lost Corridors (iPhone + iPad) | 2026-11-05 | https://apps.apple.com/us/app/lost-corridors/id6828006802 | `backrooms` (WebGL game + Capacitor) |

"Two shipped App Store apps, built and released alone" is one of the strongest
claims on the site for the readers it is for (people hiring). The site
undersells it today.

## What the site says today

- **The assistant's knowledge** (`bfoster-services/assistant-bfoster.txt`) knows
  AskGWINnett is on the App Store. It has **no mention of Lost Corridors on iOS**.
  Line 177's "iOS / mobile apps" paragraph names only AskGWINnett, and line 68's
  mobile stack says "native iOS app" (singular). So the Face page and Home chat
  will answer "Can Brian make mobile apps?" with one app. The screenshot that
  started this is exactly that answer.
- **The résumé PDF** is generated from that same file (`server/resume-pdf.js`), so
  it has the same gap.
- **Explore → "His own work"** (`src/utils/siteDetector.js`):
  - The AskGWINnett card links the App Store (0.4.209) and has a current summary
    (0.4.212). Its screenshots are web captures from Aug 1.
  - The Lost Corridors card has no App Store link. Its summary is web-only and
    stale ("Controls are in the nav bar… saved between reloads"; no Escape mode,
    four maze sizes, the Bacteria or offline play). Its screenshots are July
    desktop captures.
- **Home** has the chips "Tell me about AskGWINnett" and "Tell me about Lost
  Corridors". Nothing on the page says "App Store" unless you ask.

## Recommendation

Put the facts right first, then make the claim visible. **No new page.**

### Phase 1: facts (bfoster-services) — most of the value

1. `assistant-bfoster.txt`:
   - "iOS / mobile apps" paragraph: two current apps, each with its listing URL,
     live date, and what is native about it (AskGWINnett: voice, read-aloud
     through AudioSession, push notifications, universal links, iPad; Lost
     Corridors: offline play, WebGL on device, iPad).
   - Mobile stack lines (68, 209): "two native iOS apps shipped to the App Store
     from web codebases with Capacitor".
   - Personal-projects lines (172, 299): Lost Corridors gets "(iPhone and iPad
     app on the App Store)" like AskGWINnett has.
   - Résumé spans: add a résumé-marked line so the PDF lists both apps.
2. `eval/assistant-cases.js`: a golden case, "Does Brian have apps in the App
   Store?", which must name both and must not invent a third or an Android
   listing. Run it on the weakest allowed model.

### Phase 2: Explore cards (rabinforest)

1. Lost Corridors card: add a `docs` entry "iPhone and iPad app (App Store)".
   Rewrite the summary for what the game is now (Escape mode, four maze sizes,
   the Bacteria, plays offline on iPhone and iPad), keeping the
   procedural-growth and AI-gated-content points.
2. Screenshots for both cards: lead with the 1.0.1 phone and iPad store captures
   (`backrooms/.docs/store/screenshots`, regenerated with `shots.mjs`) and the
   AskGWINnett phone/iPad shots (`county-app/docs/store/screenshots`). Keep one
   web capture each so the cards still show "it's also a website".

### Phase 3: Home (rabinforest)

An **"On the App Store"** band: two tiles, each with the app icon, name, one line,
Apple's official "Download on the App Store" badge linking to the listing, and
the website link. It goes between the hero and the "How this is built" band.
Plus one chip: "What apps has Brian shipped?"

The badge must be Apple's artwork, unmodified (App Store marketing guidelines),
so tiles use the official SVG rather than a styled button.

### Phase 4 (optional): search

`MobileApplication` JSON-LD for both apps on the home route (`routeMeta.js` /
prerender). This is cheap, but the payoff is small for a portfolio site, so do
it only if Phase 3 ships.

## Anti-goals

- **No `/apps` page.** It would duplicate Explore and be a thin page. Two tiles on
  Home do more.
- **No ratings or review counts.** Both apps are days old with few or no
  ratings, and showing them would hurt. The App Store has no public ratings API
  without scraping either.
- **No Android or Google Play claims** unless a Play listing exists. The
  AskGWINnett "Android install badge" is a PWA install, not a store listing.
- **No download numbers** anywhere.

## Cost (honest)

| Phase | Work | Estimate |
|---|---|---|
| 1 | KB edits + golden case + eval run | ~45 min |
| 2 | Card copy + choosing and copying screenshots | ~45 min |
| 3 | Home band, badge assets, light/dark check, mobile width | ~1.5 h |
| 4 | JSON-LD + prerender check | ~30 min |

About half a day for 1–3. Phase 1 deploys on push (bfoster-services → Heroku).
Phases 2–3 deploy on push (rabinforest → Vercel). Each push waits for Brian.

## Open questions for Brian

1. **Home band:** do you want it, and between the hero and "How this is built"?
   Or does Lost Corridors, a game, belong lower on a hiring-facing home page,
   with AskGWINnett alone above the fold?
2. **Screenshots:** the captioned App Store images (marketing look), or the raw
   uncaptioned device captures (fits the existing gallery better)? I lean
   toward raw.
3. **Android:** is either app headed for Google Play soon? If so, Phase 3 should
   leave room for a second badge now.
4. **Lost Corridors 1.0.1:** is it approved yet? The card copy should describe
   what is live on the store, not what's in review.
