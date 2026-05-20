# Event Media Platform Setup

## Supabase

1. Enable Anonymous Sign-Ins:
   - Supabase Dashboard → Authentication → Providers → Anonymous sign-ins → Enable.

2. Apply schema:
   - Run `supabase/migrations/20240000000000_event_media_platform.sql` in Supabase SQL Editor.
   - The script creates `events`, `event_photos`, indexes, RLS policies, public `event-media` bucket, and realtime publication.

3. Confirm Realtime:
   - Dashboard → Database → Replication → `event_photos` should be in `supabase_realtime`.

## Environment

Copy `env.example` to `.env` and set:

```bash
VITE_SUPABASE_URL=<YOUR SUPABASE URL>
VITE_SUPABASE_KEY=<YOUR SUPABASE ANON KEY>
VITE_EVENT_ID=wedding-demo
VITE_MEDIA_BUCKET=event-media
```

## Run

```bash
npm install
npm run dev
```

Open:

```text
/event/wedding-demo
```

Test with two browsers/devices. Upload on one device; the other should update via Supabase Realtime.

## Current MVP scope

- Latest 50 approved items only.
- 20MB upload limit.
- Images/videos supported.
- `thumbnail_url` and `ai_tags` are present for later moderation/thumbnail pipeline.
