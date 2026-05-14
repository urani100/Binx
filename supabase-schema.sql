-- BiNx Supabase Schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/ttnunlnryjtvnnqvpplb/sql)

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  profile jsonb not null default '{}',
  created_at timestamptz default now()
);

create table if not exists public.pins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text,
  note text,
  mood text,
  location jsonb,
  photo text,
  audio_url text,
  cultural_context text default 'Personal discovery',
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.pins enable row level security;

create policy "Users can view own data"   on public.users for select using (auth.uid() = id);
create policy "Users can insert own data" on public.users for insert with check (auth.uid() = id);
create policy "Users can update own data" on public.users for update using (auth.uid() = id);

create policy "Users can view own pins"   on public.pins for select using (auth.uid() = user_id);
create policy "Users can insert own pins" on public.pins for insert with check (auth.uid() = user_id);
create policy "Users can delete own pins" on public.pins for delete using (auth.uid() = user_id);

-- ─── Storage Buckets ──────────────────────────────────────────────────────────
-- Create these buckets in Storage dashboard, then run the policies below.
-- Bucket: user-assets  (public: true)
-- Bucket: pin-assets   (public: true)

-- user-assets policies
create policy "Users can upload own assets"
  on storage.objects for insert
  with check (bucket_id = 'user-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own assets"
  on storage.objects for update
  using (bucket_id = 'user-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own assets"
  on storage.objects for delete
  using (bucket_id = 'user-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "User assets are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'user-assets');

-- pin-assets policies
create policy "Users can upload own pin assets"
  on storage.objects for insert
  with check (bucket_id = 'pin-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own pin assets"
  on storage.objects for delete
  using (bucket_id = 'pin-assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Pin assets are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'pin-assets');
