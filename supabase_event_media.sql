create extension if not exists pgcrypto;

create table if not exists public.events (
  id text primary key,
  name text not null default 'Wedding Event',
  description text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  uploaded_by uuid,
  guest_name text not null check (char_length(guest_name) <= 64),
  media_type text not null check (media_type in ('image', 'video')),
  original_url text not null,
  storage_path text not null,
  thumbnail_url text,
  table_id text check (char_length(table_id) <= 64),
  likes integer not null default 0 check (likes >= 0),
  is_approved boolean not null default true,
  ai_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists event_photos_latest_idx
  on public.event_photos (event_id, is_approved, created_at desc);

create table if not exists public.event_media_reactions (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.event_photos(id) on delete cascade,
  event_id text not null references public.events(id) on delete cascade,
  user_id uuid,
  guest_name text not null check (char_length(guest_name) <= 64),
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now()
);

create index if not exists event_media_reactions_media_idx
  on public.event_media_reactions (media_id, created_at desc);

create index if not exists event_media_reactions_event_idx
  on public.event_media_reactions (event_id, created_at desc);

insert into public.events (id, name, description)
values ('wedding-demo', 'Wedding Demo', 'Realtime wedding media demo')
on conflict (id) do nothing;

alter table public.events enable row level security;
alter table public.event_photos enable row level security;
alter table public.event_media_reactions enable row level security;

drop policy if exists "events are readable" on public.events;
create policy "events are readable"
  on public.events for select
  to anon, authenticated
  using (true);

drop policy if exists "authenticated users can create events" on public.events;
create policy "authenticated users can create events"
  on public.events for insert
  to authenticated
  with check (true);

drop policy if exists "approved event photos are readable" on public.event_photos;
create policy "approved event photos are readable"
  on public.event_photos for select
  to anon, authenticated
  using (is_approved = true);

drop policy if exists "authenticated guests can upload event photos" on public.event_photos;
create policy "authenticated guests can upload event photos"
  on public.event_photos for insert
  to authenticated
  with check (
    auth.uid() = uploaded_by
    and is_approved = true
    and media_type in ('image', 'video')
  );

drop policy if exists "event reactions are readable" on public.event_media_reactions;
create policy "event reactions are readable"
  on public.event_media_reactions for select
  to anon, authenticated
  using (true);

drop policy if exists "authenticated guests can react" on public.event_media_reactions;
create policy "authenticated guests can react"
  on public.event_media_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-media',
  'event-media',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "event media is publicly readable" on storage.objects;
create policy "event media is publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'event-media');

drop policy if exists "authenticated guests can upload event media" on storage.objects;
create policy "authenticated guests can upload event media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'event-media'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

do $$
begin
  alter publication supabase_realtime add table public.event_photos;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.event_media_reactions;
exception
  when duplicate_object then null;
end $$;
