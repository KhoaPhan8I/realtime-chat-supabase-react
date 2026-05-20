# Event Media Platform Setup

## Supabase Database Setup
1. Run the migration script in `supabase/migrations/20240000000000_event_media_platform.sql` in your Supabase SQL Editor.
2. Ensure "Realtime" is enabled for `events` and `event_photos` tables in the Supabase Dashboard.

## Supabase Storage Setup
1. Create a new public bucket named `event-media`.
2. Add the following RLS policies to the `event-media` bucket:
   - **Select:** Allow `public` (anyone) to select files.
   - **Insert:** Allow `public` (anyone) to insert files.
   - **Optional:** Add size constraint (up to 20MB) and file type constraints (image/*, video/*) if desired in the policy or use the upload logic.

Example Storage Policy for Insertion:
```sql
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'event-media' AND
  (lower(storage.extension(name)) = ANY (ARRAY['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov']))
);
```

Example Storage Policy for Selection:
```sql
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'event-media');
```

## Environment Variables
Ensure your `.env` or Vercel environment variables are set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`
