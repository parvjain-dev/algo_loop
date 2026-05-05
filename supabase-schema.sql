-- Supabase SQL Schema for Algo Loop
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Problems table
create table public.problems (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text default '',
  link text default '',
  pattern text not null,
  effort text not null check (effort in ('low', 'medium', 'high')),
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

-- Row Level Security
alter table public.problems enable row level security;
alter table public.revisions enable row level security;
alter table public.notifications enable row level security;

create policy "Users can manage own problems" on public.problems
  for all using (auth.uid() = user_id);

create policy "Users can manage own revisions" on public.revisions
  for all using (auth.uid() = user_id);

create policy "Users can manage own notifications" on public.notifications
  for all using (auth.uid() = user_id);

-- Indexes
create index idx_problems_user_id on public.problems(user_id);
create index idx_problems_next_revision on public.problems(next_revision);
create index idx_revisions_user_id on public.revisions(user_id);
create index idx_notifications_user_id on public.notifications(user_id, read);
