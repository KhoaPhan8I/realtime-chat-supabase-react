-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Create event_photos table
CREATE TABLE IF NOT EXISTS event_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID, -- Can be null for anonymous guests
  guest_name TEXT NOT NULL,
  table_id TEXT,
  media_type TEXT NOT NULL, -- 'image' or 'video'
  original_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  likes INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT TRUE, -- Defaulting to TRUE for MVP
  ai_tags JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

-- Policies for events
CREATE POLICY "Public read access for events" ON events
  FOR SELECT USING (true);

-- Policies for event_photos
CREATE POLICY "Public read access for approved event_photos" ON event_photos
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Anonymous guest upload" ON event_photos
  FOR INSERT WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_photos;

-- STORAGE SETUP
-- Create a new bucket 'event-media'
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-media', 'event-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to 'event-media' bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'event-media' );

-- Allow anonymous uploads to 'event-media' bucket
CREATE POLICY "Anonymous Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'event-media' );
