-- ScriptStore isolated schema for Roblox Studio / Luau community resources.
-- Run this in the NEW ScriptStore project's Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.script_items (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 90),
  game_name text not null default '' check (char_length(game_name) <= 60),
  category text not null check (category in ('Gameplay','UI','Utilities','Data','Learning')),
  description text not null check (char_length(description) between 10 and 700),
  code_text text not null check (char_length(code_text) between 1 and 30000),
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.script_likes (
  script_id uuid not null references public.script_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (script_id,user_id)
);

create table if not exists public.script_favorites (
  script_id uuid not null references public.script_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (script_id,user_id)
);

create table if not exists public.script_comments (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.script_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists script_items_public_feed_idx on public.script_items(status,created_at desc);
create index if not exists script_items_author_idx on public.script_items(author_id,created_at desc);
create index if not exists script_comments_script_idx on public.script_comments(script_id,created_at);

alter table public.script_items enable row level security;
alter table public.script_likes enable row level security;
alter table public.script_favorites enable row level security;
alter table public.script_comments enable row level security;

grant select on public.script_items to anon, authenticated;
grant insert, update, delete on public.script_items to authenticated;
grant select on public.script_likes to anon, authenticated;
grant insert, delete on public.script_likes to authenticated;
grant select, insert, delete on public.script_favorites to authenticated;
grant select, insert, delete on public.script_comments to authenticated;

create policy "Published scripts are public" on public.script_items
for select to anon, authenticated using (status = 'published' or author_id = (select auth.uid()));

create policy "Users submit pending scripts" on public.script_items
for insert to authenticated with check (author_id = (select auth.uid()) and status = 'pending');

create policy "Authors edit only pending scripts" on public.script_items
for update to authenticated using (author_id = (select auth.uid()) and status = 'pending')
with check (author_id = (select auth.uid()) and status = 'pending');

create policy "Authors delete their own pending scripts" on public.script_items
for delete to authenticated using (author_id = (select auth.uid()) and status = 'pending');

create policy "Likes visible on published scripts" on public.script_likes
for select to anon, authenticated using (exists(select 1 from public.script_items s where s.id=script_id and s.status='published'));

create policy "Users like as themselves" on public.script_likes
for insert to authenticated with check (user_id = (select auth.uid()) and exists(select 1 from public.script_items s where s.id=script_id and s.status='published'));

create policy "Users remove own likes" on public.script_likes
for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users read own favorites" on public.script_favorites
for select to authenticated using (user_id = (select auth.uid()));

create policy "Users save published scripts" on public.script_favorites
for insert to authenticated with check (user_id = (select auth.uid()) and exists(select 1 from public.script_items s where s.id=script_id and s.status='published'));

create policy "Users remove own favorites" on public.script_favorites
for delete to authenticated using (user_id = (select auth.uid()));

create policy "Comments visible on published scripts" on public.script_comments
for select to authenticated using (exists(select 1 from public.script_items s where s.id=script_id and s.status='published'));

create policy "Signed-in users comment on published scripts" on public.script_comments
for insert to authenticated with check (user_id = (select auth.uid()) and exists(select 1 from public.script_items s where s.id=script_id and s.status='published'));

create policy "Users delete own comments" on public.script_comments
for delete to authenticated using (user_id = (select auth.uid()));

-- Moderation is intentionally not granted to client-side users.
-- Add a trusted server-side admin workflow after assigning an administrator.
