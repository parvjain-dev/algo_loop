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

## License

MIT
