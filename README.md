# PlagCheck

A free, standalone plagiarism checker built for the ERS content team. Paste
any length of blog text, get an originality score, color-coded highlights,
and matched source URLs — powered by free-tier web search APIs (no shared
server-side keys, no database).

See `plagiarism-checker-plan.md`-equivalent context in the project history
for the full design doc this was built from.

## Status

**Phases 1–2 of the plan are done:** project foundation + the core
plagiarism-detection engine, wired end-to-end and tested against live
Serper/SerpApi keys.

✅ Implemented:
- Next.js 16 (App Router) + TypeScript + TailwindCSS scaffold
- Text input with live word/char count
- Settings panel — Serper.dev / SerpApi keys stored in browser LocalStorage only
- `/api/check` route: sentence tokenizer → smart distinctiveness sampling
  (max 20 queries) → Serper search with SerpApi fallback → Cheerio content
  extraction → exact-match + n-gram Jaccard + Dice-coefficient comparison →
  word-weighted originality scoring
- Results panel: animated score gauge, original/paraphrased/matched
  breakdown, per-source match list
- Inline sentence highlighting (green/amber/red) with an "Edit Text" toggle
  to go back to editing after a check

⏳ Not yet built (see plan Phases 3–7):
- Credit monitoring UI (gauge, threshold banners, pre-check estimates,
  Serper-expiry warnings) — currently the app just surfaces API errors as
  warnings and falls back Serper → SerpApi silently
- Result caching (24h TTL) to save credits on repeat checks
- PDF export
- Check history, dark mode, batch checking, "exclude URL", Supabase

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, click **Settings**, and paste your own
Serper.dev and/or SerpApi API key (never sent anywhere but the search
provider itself, proxied through `/api/check`).

## Known limitation carried from the plan

Vercel's free-tier serverless functions cap at 10s; a full check can take
15–30s. This build sets `maxDuration = 60` (works locally / on Pro) but
still needs the plan's recommended chunked-request approach before a Hobby
deploy to Vercel — see Section 12 of the original plan doc for the pattern.
