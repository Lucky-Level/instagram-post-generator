-- 006_avatars.sql
-- Avatar entity: persistent face identity for brand agents.
-- Used with FLUX Kontext Pro for face preservation in generated images.

CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_agent_id UUID REFERENCES brand_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'model',  -- 'founder', 'model', 'mascot', 'spokesperson'
  face_image_url TEXT NOT NULL,  -- base64 data URL or Supabase storage URL
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup by brand agent
CREATE INDEX IF NOT EXISTS idx_avatars_brand_agent ON avatars(brand_agent_id);

-- RLS (permissive for MVP — tighten later with auth)
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avatars_all" ON avatars FOR ALL USING (true) WITH CHECK (true);
