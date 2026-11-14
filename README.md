# Algo Loop - DSA Revision Tracker

Master DSA with spaced repetition. Track problems, build streaks, and never forget a pattern.

## Features

- 🔐 GitHub OAuth authentication
- 📅 Spaced repetition scheduling (based on effort level)
- 🔥 Daily & weekly streak tracking
- 📊 Analytics - patterns, effort distribution, revision history
- 📝 Reflection journal after each revision
- 🔔 In-app notification center
- 🎨 Dark mode UI

## Tech Stack (100% Free)

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **Hosting**: Vercel (free tier)
- **Auth**: GitHub OAuth via Supabase

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Go to **Authentication > Providers** and enable GitHub
4. Create a GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers):
   - Homepage URL: `http://localhost:3000` (or your Vercel URL)
   - Callback URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
5. Copy the Client ID and Secret into Supabase GitHub provider settings

### 2. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in your Supabase URL and anon key from **Settings > API** in Supabase dashboard.

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel (Free)

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy!
5. Update your GitHub OAuth App callback URL to use your Vercel domain

## Spaced Repetition Schedule

| Effort | Revision Intervals |
|--------|-------------------|
| High   | 1, 3, 7, 14, 30 days |
| Medium | 2, 5, 14, 30 days |
| Low    | 3, 7, 30 days |

## AI Round

Practice for AI-assisted coding interviews: a multi-file Python codebase, tests that unlock phase by phase, an AI chat that can read (not edit) the files, and a review at the end.

- **Formats** are generic patterns (Bug → Build → Scale, Read & Repair, Open Build, Solo). Each carries tags saying where the pattern was seen and whether that source is official or reported (`src/lib/ai-round/formats.ts`). Re-check sources and update `SOURCES_CHECKED` from time to time.
- **Bring your own key:** Gemini, OpenAI or Claude. Keys are validated by listing models (no tokens spent), encrypted with AES-256-GCM using `AI_KEY_SECRET`, and only decrypted inside API routes.
- **Tests run in the browser:** Pyodide + real pytest in a Web Worker (`public/ai-round/`). Pytest wheels are bundled; Pyodide loads from jsDelivr. Hung runs are stopped after 30s.
- **Generated problems are checked before use:** each phase's tests must fail on the starter code and the hidden solution must pass everything, or the problem is regenerated (up to 3 tries). A curated problem (Log Analyzer) is always available.
- **The review can't make things up:** numbers and the headline are computed from the event log by code. Every AI-written point must cite real events; quotes must match word for word; counts must appear in the cited events; claims about running tests or pasting must cite a test run or paste. Anything else is removed. When a session is strong (all phases done, nothing flagged), only praise is shown.

### Setup

1. Run `supabase-ai-round.sql` in the Supabase SQL editor (adds 4 tables with row-level security).
2. Add `AI_KEY_SECRET` to `.env.local` and to Vercel's environment variables (`openssl rand -base64 32`).
3. Open **AI Round** in the sidebar, connect a key, and start.

## License

MIT
