# PlagCheck

A free, standalone plagiarism checker built for the ERS content team. Paste
any length of blog text, get an originality score, color-coded highlights,
matched source URLs, and a downloadable PDF report — checked via this app's
own Serper/SerpApi web-search pipeline, Winston AI's plagiarism API, or
both at once.

## Status

**Phases 1, 2, 3, 5, and part of 7 are done**, plus a shared-key deployment
model (see below), a chunked-request rewrite so checks survive Vercel's
serverless timeout, a Winston AI integration (alternate plagiarism engine +
AI-content detection), ERS brand styling, and a manual dark mode.

✅ Implemented:
- Next.js 16 (App Router) + TypeScript + TailwindCSS, styled with
  eliteresourceservices.com's own brand colors (`#8A2BE2` purple primary)
  and type system (Source Sans 3 headings, Inter body). **Dark mode**
  toggle in the header (persisted, no flash on reload) — a neutral dark
  surface with brand purple kept strictly as an accent, never the
  dominant background
- Three ways to get text in: paste/type, **file upload** (see below), or
  **Check URL** — paste a published blog/article URL and the app fetches
  and extracts its text server-side, ready to check like any pasted draft
- `/api/search` + `/api/check`: sentence tokenizer → client-side smart
  distinctiveness sampling (max 20 queries, sent to `/api/search` in
  batches of 5 so each request stays well under 10s) → Serper search with
  SerpApi fallback → Cheerio content extraction → exact-match + n-gram
  Jaccard + Dice-coefficient comparison → word-weighted originality scoring
- **Winston AI integration** (optional, see below):
  - An alternate **plagiarism engine** — sends text straight to
    gowinston.ai's own web-search-and-match API instead of this app's
    pipeline, shown as its own result card. Selectable in Settings →
    Advanced: Web Search, Winston AI, or **Both** at once (runs
    concurrently; if one engine fails the other's result still shows)
  - **AI-generated-content detection** — an independent check (Winston's
    "Human Score") that can run alongside either plagiarism engine,
    flagging sentences likely written by AI. A quick-access toggle sits
    right on the dashboard (above the Check button) whenever Winston is
    configured — not just in Settings → Advanced
- Results panel: donut-chart score breakdown (original/paraphrased/matched,
  or original/similar/identical for Winston) with legend and center score,
  per-source match list, inline sentence highlighting, PDF export (works
  for the web-search result, the Winston result, or both at once)
- **Settings → About**: current app version and a changelog of what
  shipped when
- **Credit monitoring**: usage tracking, toast alerts at 80/90/95/100%
  thresholds, header credit gauge, persistent banner, pre-check estimate
  (engine-aware — quotes Serper/SerpApi, Winston, or both), Settings →
  Usage breakdown with manual reset
- **Result caching**: 24h TTL LocalStorage cache keyed by search phrase —
  cache hits never touch the network or count against credits
- **Check history**: last 20 checks, score badges, per-entry delete
- **Exclude URLs**: Settings → Advanced, so your own sites don't self-flag
- **Fails loudly, not silently**: if every live search attempt fails (bad
  key, provider outage), the app throws a clear error instead of quietly
  returning a misleading "100% original"
- **File upload**: `.txt`/`.md` read instantly client-side, `.html` parsed
  client-side (no upload), `.pdf`/`.docx` extracted server-side (pdf-parse /
  mammoth via `/api/extract-text`). Drag-and-drop onto the text box works
  too.
- **Citations**: APA/MLA/Chicago citation for every matched source, styled
  as a standard "no listed author" web citation (site name in place of an
  author, since scraped pages rarely expose one) — one click to copy, and
  included in the PDF export
- **Additional quality checks** (verified directly, not just in the UI):
  - Missing quotation marks on verbatim-matched sentences (an unattributed
    direct quote)
  - Self-plagiarism / recycled content — compares your draft against your
    own past checks in History, entirely client-side (no API credits)
  - Formatting anomalies — hidden Unicode characters, mixed quote styles,
    irregular spacing, mixed citation conventions (classic copy-paste tells)
  - Manual credit-usage sync (Settings → Usage) to correct the per-browser
    gauge against Serper's/SerpApi's real dashboard numbers

⏳ Not yet built: batch checking, and merging Winston's plagiarism result
into the self-plagiarism/history comparison (it's tracked as a separate
result shape from the Serper/SerpApi `CheckResult` by design — see
`lib/winston.ts`).

**Note:** every page (and the PDF export footer) is watermarked "This
tool is exclusively for Elite Resource Services Internal Team" — this is
an internal tool, not meant for outside distribution.

## Login gate (email allowlist)

The whole app sits behind a signed-cookie login gate — no Google OAuth, no
Supabase, no signup page. It's just an email allowlist checked
server-side:

- Visiting any protected route with no valid session redirects to
  `/login`, which asks for an email and POSTs it to `/api/auth/login`.
- The server normalizes the email (lowercase, trimmed) and checks it
  against `APPROVED_EMAILS` (a comma-separated env var). If it matches, a
  `{ email, exp }` payload is HMAC-SHA256-signed with `AUTH_SECRET` and set
  as an HTTP-only, Secure, `SameSite=Strict` cookie good for 7 days, and
  the client is sent to the dashboard.
- If the email isn't on the list, the API returns 401 and the client shows
  `/denied` — "This tool is for authorized ERS team members only."
- `proxy.ts` (Next 16's renamed `middleware.ts` — see [Migration to
  Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy#migration-to-proxy))
  runs on every request to a protected route, re-verifies the cookie's
  signature, expiry, and that the email is still on the allowlist, and
  clears the cookie + redirects to `/login` if any check fails — so
  removing someone from `APPROVED_EMAILS` locks them out immediately, no
  waiting for the cookie to expire.
- `ADMIN_EMAIL` (optional) is checked in `proxy.ts` and forwarded as an
  `x-is-admin` header — reserved for a future admin panel, unused in the
  MVP. Team membership itself is managed by editing `APPROVED_EMAILS` in
  the Vercel dashboard and redeploying (~1 min), not through any in-app UI.

Required env vars: `APPROVED_EMAILS`, `AUTH_SECRET` (generate with
`openssl rand -hex 32`), and `ADMIN_EMAIL`. See `.env.example`.

## API keys — shared by default

Unlike the original per-user-LocalStorage-only design, this app now
supports **shared, server-side API keys** so the team doesn't need everyone
to sign up individually:

- Set `SERPER_API_KEY` / `SERPAPI_API_KEY` as server environment variables
  (locally in `.env.local`, or in Vercel's Project Settings → Environment
  Variables). Once set, *everyone* using the app can run checks immediately
  — no Settings configuration needed.
- Optionally set `SERPER_API_KEY_2` for a second Serper account — it's
  tried automatically once the first key's free credits run out, before
  the app ever falls back to SerpApi. Stack as many of these as you have
  spare accounts for; leave it blank if you don't need it.
- Anyone can still add their **own personal key** in Settings → API Keys.
  A personal key always takes priority over the shared ones, so if the
  whole shared pool runs low, individuals can bring their own capacity.

### Winston AI (optional) — alternate engine + AI-content detection

Set `WINSTON_API_KEY` as a server environment variable to enable:
- **Winston AI** as a selectable plagiarism engine (Settings → Advanced),
  alongside a **Both** mode that runs it and Web Search concurrently
- An **AI-content detection** check (toggle in the same panel) that flags
  sentences likely written by AI, shown as its own card

Get a key at [gowinston.ai](https://gowinston.ai) (14-day free trial, then
a paid plan). Unlike Serper/SerpApi, this is **server-side only** — there's
no personal-key override in Settings, since it's a shared team
subscription rather than a free per-user account.

Winston bills per word (2 credits/word for the plagiarism scan) rather
than per query, and its own API response tells you exactly how many
credits remain after every call — no constant to configure or keep in
sync.

### Shared, live credit tracking (Upstash Redis)

The credit gauge/banners/pre-check estimate are backed by real shared
state, not a per-browser guess — the **server itself** increments a Redis
counter at the moment a Serper/SerpApi/Winston call actually succeeds, so
it can't drift, and everyone (any browser, any device) sees the same
numbers.

Setup: in the Vercel dashboard, go to your project → **Integrations** (or
**Storage**) → add **Upstash Redis** from the Marketplace, choose the free
tier, and connect it to this project. Vercel auto-injects
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — no manual copying
needed. Redeploy once it's connected.

Without it, the app still works exactly the same — search/check/etc are
unaffected — the credit gauge just shows a "not configured yet" note. For
Serper/SerpApi it stays at a placeholder 0; Winston is the exception —
since Winston's own response always includes the real remaining balance,
the browser that ran the check caches and displays that number locally
even without Redis (see `lib/localWinstonCredits.ts`), just not shared
across other browsers/devices the way Redis-backed tracking is.

The one remaining manual step: **Settings → Usage → Sync with actual
usage** is for the rare case something used credits *outside* the app
(e.g. testing a key directly on Serper's own console) — paste the real
numbers from the provider's dashboard and it corrects the shared count for
everyone.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in your own key values
npm run dev
```

Open http://localhost:3000 — if `.env.local` has real keys, checks work
immediately with no Settings configuration.

## Deploying

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. Import the repo into Vercel.
3. In Vercel → Project Settings → Environment Variables, add
   `APPROVED_EMAILS`, `AUTH_SECRET`, and `ADMIN_EMAIL` (see [Login
   gate](#login-gate-email-allowlist) above) — without these the login
   screen can't authenticate anyone. Then add
   `SERPER_API_KEY` and `SERPAPI_API_KEY` with your real values (never
   commit real keys to the repo — `.env.local` is git-ignored for exactly
   this reason). Add `WINSTON_API_KEY` too if you want the Winston AI
   engine and AI-content detection available — paste the value in cleanly
   once; a stray extra paste or line break in the field breaks the
   Authorization header (surfaces as a generic "couldn't reach Winston AI"
   error rather than anything more specific, since the real header value
   is never echoed back to the client).
4. Deploy. Share the Vercel URL with the team — no further setup needed.

### Why this survives Vercel's free-tier timeout

Vercel's Hobby tier caps serverless functions at 10 seconds, but a full
plagiarism check (search + fetch + compare) can take 15–30s end-to-end if
done in one shot. This app avoids that by splitting the work across
multiple small requests instead of one long one:

1. The client samples search queries and checks its LocalStorage cache.
2. Cache misses are sent to `/api/search` in batches of 5 queries at a
   time — each batch runs its queries concurrently and returns in a few
   seconds.
3. Once all batches are back, `/api/check` does the (fast, CPU-only)
   ranking + source fetching + comparison and returns the final score.

Each individual request stays comfortably under the 10s cap, so the app
works on Vercel's free tier without needing a paid plan bump.
