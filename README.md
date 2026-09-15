# PlagCheck

A free, standalone plagiarism checker built for the ERS content team. Paste
any length of blog text, get an originality score, color-coded highlights,
matched source URLs, and a downloadable PDF report — powered by free-tier
web search APIs (no shared server-side keys, no database).

## Status

**Phases 1, 2, 3, 5, and part of 7 are done.**

✅ Implemented:
- Next.js 16 (App Router) + TypeScript + TailwindCSS scaffold, indigo-accented
  Grammarly-inspired UI
- Text input with live word/char count, Settings panel (API keys →
  LocalStorage only, explicit Save/Cancel — never auto-saves partial state)
- `/api/check` route: sentence tokenizer → client-side smart distinctiveness
  sampling (max 20 queries) → Serper search with SerpApi fallback → Cheerio
  content extraction → exact-match + n-gram Jaccard + Dice-coefficient
  comparison → word-weighted originality scoring
- Results panel: animated score gauge, original/paraphrased/matched
  breakdown, per-source match list, inline sentence highlighting with an
  "Edit Text" toggle
- **Credit monitoring** (Phase 3): per-API usage tracking in LocalStorage,
  toast alerts at 80/90/95/100% thresholds, a header credit gauge, a
  persistent banner at 90%+, a full-screen block when both APIs are
  depleted, a pre-check credit estimate, Serper 6-month expiry tracking, and
  a Settings → Usage tab with per-API breakdown + manual reset
- **Result caching** (Phase 3): 24h TTL LocalStorage cache keyed by search
  phrase, checked client-side before any API call — cache hits never count
  against credits (verified: re-running an identical check used 0 new
  queries), 5MB cap with oldest-first eviction, visible/clearable in Settings
- **PDF export** (Phase 5): client-side jsPDF report — score, breakdown,
  source table, full color-coded text, disclaimer footer, paginated
- **Check history** (Phase 7): last 20 checks in LocalStorage with score
  badge, date, word count, source count; clear-all and per-entry delete
- **Exclude URLs** (Phase 7): Settings → Advanced lets you list your own
  domains so republished content doesn't flag itself

⏳ Not yet built:
- Dark mode, batch checking, Supabase-backed history (would need a Supabase
  project the team provisions)
- The plan's chunked-request pattern for surviving Vercel's Hobby-tier 10s
  function timeout on a real deploy (works today via `maxDuration = 60`,
  which only takes effect on Pro/self-hosted)

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Settings**, and paste your own
Serper.dev and/or SerpApi API key.

## Known limitation carried from the plan

Vercel's free-tier serverless functions cap at 10s; a full check can take
15–30s. See Section 12 of the original plan doc for the recommended
chunked-frontend-requests pattern before deploying to a Hobby-tier project.
