-- Supabase SQL Schema for Algo Loop
-- FOR A FRESH SUPABASE PROJECT ONLY (Dashboard > SQL Editor).
-- Do NOT run this on a database that already has these tables.
-- To upgrade an existing database, use add-multiple-patterns.sql instead.

-- Problems table
create table public.problems (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text default '',
  link text default '',
  -- First selected pattern. Kept for backward compatibility; the app reads `patterns`.
  pattern text not null,
  -- All selected patterns (one or more)
  patterns text[] not null default '{}',
  -- How the problem was last solved: under_25 | over_25 | with_hints | with_solution
  effort text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  -- -1 = added but not solved yet
  revision_count integer default 0,
  next_revision timestamptz not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Revisions table
create table public.revisions (
  id uuid default gen_random_uuid() primary key,
  problem_id uuid references public.problems(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_at timestamptz default now(),
  reflection text
);

-- Notifications table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  message text not null,
  read boolean default false,
  problem_id uuid references public.problems(id) on delete set null,
  created_at timestamptz default now()
);

-- Feedback table
create table public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_name text,
  message text not null,
  created_at timestamptz default now()
);

-- Weekly contest attempts (one per user per week, week_start = Monday)
create table public.contest_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  problems jsonb not null,
  duration_seconds integer not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer not null default 0,
  solved_count integer not null default 0,
  unique (user_id, week_start)
);

-- Row Level Security
alter table public.problems enable row level security;
alter table public.revisions enable row level security;
alter table public.notifications enable row level security;
alter table public.feedback enable row level security;
alter table public.contest_attempts enable row level security;

create policy "Users can manage own problems" on public.problems
  for all using (auth.uid() = user_id);

create policy "Users can manage own revisions" on public.revisions
  for all using (auth.uid() = user_id);

create policy "Users can manage own notifications" on public.notifications
  for all using (auth.uid() = user_id);

create policy "Users can manage own contest attempts" on public.contest_attempts
  for all using (auth.uid() = user_id);

-- Users can send feedback and see their own
create policy "Users can insert own feedback" on public.feedback
  for insert with check (auth.uid() = user_id);

create policy "Users can read own feedback" on public.feedback
  for select using (auth.uid() = user_id);

-- Admin page: let the admin read ALL feedback. Replace YOUR_USER_ID with your
-- auth.users id (Authentication > Users), then uncomment and run:
-- create policy "Admin can view all feedback" on public.feedback
--   for select using (auth.uid() = 'YOUR_USER_ID');

-- Indexes
create index idx_problems_user_id on public.problems(user_id);
create index idx_problems_next_revision on public.problems(next_revision);
create index idx_revisions_user_id on public.revisions(user_id);
create index idx_notifications_user_id on public.notifications(user_id, read);
create index idx_contest_attempts_user_week on public.contest_attempts(user_id, week_start);