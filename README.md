# PlagCheck

A free, standalone plagiarism checker built for the ERS content team. Paste
any length of blog text, get an originality score, color-coded highlights,
matched source URLs, and a downloadable PDF report.

## Status

**Phases 1, 2, 3, 5, and part of 7 are done**, plus a shared-key deployment
model (see below) and a chunked-request rewrite so checks survive Vercel's
serverless timeout.

✅ Implemented:
- Next.js 16 (App Router) + TypeScript + TailwindCSS, indigo-accented
  Grammarly-inspired UI
- `/api/search` + `/api/check`: sentence tokenizer → client-side smart
  distinctiveness sampling (max 20 queries, sent to `/api/search` in
  batches of 5 so each request stays well under 10s) → Serper search with
  SerpApi fallback → Cheerio content extraction → exact-match + n-gram
  Jaccard + Dice-coefficient comparison → word-weighted originality scoring
- Results panel: animated score gauge, original/paraphrased/matched
  breakdown, per-source match list, inline sentence highlighting, PDF export
- **Credit monitoring**: usage tracking, toast alerts at 80/90/95/100%
  thresholds, header credit gauge, persistent banner, pre-check estimate,
  Settings → Usage breakdown with manual reset
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

⏳ Not yet built: dark mode, batch checking, Supabase-backed *shared* usage
tracking (see note below).

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

**Known limitation:** the credit gauge / usage history tracked in Settings
is per-browser (LocalStorage), not a true shared counter. With one primary
regular user this stays accurate enough; if several people check heavily
the same day, each person's local gauge won't reflect the others' usage
against the real shared key. True shared tracking would need a small
server-side database (Supabase slots in per the original plan) — worth
adding later if this becomes a real pain point, not before.

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
   `SERPER_API_KEY` and `SERPAPI_API_KEY` with your real values (never
   commit real keys to the repo — `.env.local` is git-ignored for exactly
   this reason).
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
