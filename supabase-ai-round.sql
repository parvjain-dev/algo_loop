-- AI Round tables. Run once in Supabase (Dashboard > SQL Editor).
-- Safe to run on an existing Algo Loop database: it only adds new tables.

-- The user's own AI provider key, encrypted by the server (AES-256-GCM with
-- AI_KEY_SECRET). The browser never receives the decrypted key.
create table public.ai_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('gemini', 'openai', 'anthropic')),
  model text not null,
  key_ciphertext text not null,
  key_hint text not null default '',          -- last 4 characters, for display
  verified_at timestamptz not null default now()
);

-- One practice session.
create table public.ai_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  format_id text not null,
  title text not null,
  source text not null check (source in ('generated', 'curated')),
  -- Problem bundle without the reference solution (see ai_session_solutions)
  problem jsonb not null,
  files jsonb not null,                        -- latest saved code
  phase integer not null default 1,            -- current phase (1-based)
  status text not null default 'active' check (status in ('active', 'finished')),
  duration_seconds integer not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  metrics jsonb,
  review jsonb,
  created_at timestamptz default now()
);

-- Reference solution, kept apart so the session page never loads it.
create table public.ai_session_solutions (
  session_id uuid primary key references public.ai_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  files jsonb not null
);

-- Everything that happens in a session, in order. The review may only make
-- claims that point at rows in this table.
create table public.ai_events (
  id bigint generated always as identity primary key,
  session_id uuid references public.ai_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  seq integer not null,
  type text not null,
  t_ms integer not null,                       -- milliseconds since session start
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  unique (session_id, seq)
);

alter table public.ai_keys enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.ai_session_solutions enable row level security;
alter table public.ai_events enable row level security;

create policy "Users manage own AI key" on public.ai_keys
  for all using (auth.uid() = user_id);
create policy "Users manage own AI sessions" on public.ai_sessions
  for all using (auth.uid() = user_id);
create policy "Users manage own AI solutions" on public.ai_session_solutions
  for all using (auth.uid() = user_id);
create policy "Users manage own AI events" on public.ai_events
  for all using (auth.uid() = user_id);

create index idx_ai_sessions_user on public.ai_sessions(user_id, created_at desc);
create index idx_ai_events_session on public.ai_events(session_id, seq);
