-- ============================================================
-- Post Agent — Brand Agent System Schema
-- Migration 001: Core tables for the Brand Agent creative system
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. BRAND AGENTS
-- Each brand/project gets its own AI Creative Director
-- ============================================================
create table brand_agents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,  -- nullable for now (no auth yet)

  -- Identity
  name text not null,                     -- "Connect Cleaner", "Lucky Level"
  slug text unique not null,              -- "connect-cleaner" (URL-safe)
  avatar_url text,                        -- Agent avatar/logo

  -- Personality (how the agent thinks and communicates)
  personality jsonb not null default '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "tone": "profissional, confiavel, premium acessivel",
  --   "energy": "calma, clean, organizada",
  --   "audience": "donas de casa e profissionais na Irlanda",
  --   "visual_language": "minimalista, fundo claro, verde como accent",
  --   "do_this": ["sempre usar fundo claro", "CTA em verde"],
  --   "never_do_this": ["nunca usar clipart", "nunca mais de 2 fontes"]
  -- }

  -- Brand Kit (visual identity)
  brand_kit jsonb not null default '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "colors": { "primary": "#2ECC71", "secondary": "#FFFFFF", "accent": "#1A1A1A" },
  --   "fonts": { "heading": "Playfair Display", "body": "Inter", "accent": "Space Grotesk" },
  --   "logos": ["url1", "url2"],
  --   "moodboard": ["url1", "url2"],
  --   "anti_references": ["url1"]
  -- }

  -- Platform-specific rules
  platform_rules jsonb not null default '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "instagram_feed": { "tone": "visual forte, pouco texto", "layout_prefs": ["texto na parte inferior"] },
  --   "linkedin": { "tone": "profissional, dados", "layout_prefs": ["graficos, numeros"] },
  --   "twitter": { "tone": "impacto rapido, direto" },
  --   "youtube_thumbnail": { "tone": "rosto grande, texto bold" }
  -- }

  -- Stats
  total_sessions int not null default 0,
  total_assets int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for user lookup
create index idx_brand_agents_user on brand_agents(user_id);
create index idx_brand_agents_slug on brand_agents(slug);

-- ============================================================
-- 2. BRAND MEMORY
-- The agent learns and improves over time
-- ============================================================
create table brand_memory (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references brand_agents(id) on delete cascade,

  -- Memory type
  type text not null check (type in (
    'feedback',        -- User said "gostei" or "ficou ruim"
    'learned_rule',    -- Extracted pattern: "user prefers minimal text"
    'style_snapshot',  -- Periodic snapshot of the agent's style understanding
    'reference_note',  -- Notes about a reference image analysis
    'anti_pattern'     -- "NEVER do this again" learned from negative feedback
  )),

  -- Content
  content jsonb not null,
  -- feedback: { "asset_id": "...", "sentiment": "positive|negative", "comment": "..." }
  -- learned_rule: { "rule": "prefer layouts with little text", "confidence": 0.8, "source_count": 3 }
  -- style_snapshot: { "dominant_colors": [...], "font_usage": {...}, "layout_patterns": [...] }

  -- Relevance score (higher = more impactful on future decisions)
  weight float not null default 1.0,

  created_at timestamptz not null default now()
);

create index idx_brand_memory_agent on brand_memory(agent_id);
create index idx_brand_memory_type on brand_memory(agent_id, type);

-- ============================================================
-- 3. CREATIVE SESSIONS
-- Each work session has context, chat history, and outputs
-- ============================================================
create table creative_sessions (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references brand_agents(id) on delete cascade,

  -- Session type
  type text not null check (type in (
    'post_single',     -- Single post for one platform
    'multi_platform',  -- One concept adapted to N platforms
    'campaign',        -- N pieces with connected narrative
    'calendar',        -- Batch for the week/month
    'refinement'       -- Adjust existing posts
  )),

  -- Brief
  title text,                             -- Auto-generated or user-defined
  brief text,                             -- User's description of what they want
  objective text,                         -- "vender", "engajar", "informar", "educar"
  platforms text[] not null default '{}', -- ["instagram_feed", "linkedin_post", ...]

  -- State
  status text not null default 'draft' check (status in (
    'draft',          -- Session created, not started
    'in_progress',    -- Agent is working
    'review',         -- Waiting for user review
    'approved',       -- User approved all assets
    'exported',       -- Assets downloaded/published
    'archived'        -- Session archived
  )),

  -- Chat history with the agent
  chat_history jsonb not null default '[]'::jsonb,
  -- Array of: { "role": "user|assistant", "content": "...", "timestamp": "..." }

  -- Complexity layer the user is working in
  complexity_layer int not null default 1 check (complexity_layer in (1, 2, 3)),
  -- 1 = One-Tap (agent decides everything)
  -- 2 = Quick Edit (user edits text/position inline)
  -- 3 = Studio (full canvas editor)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sessions_agent on creative_sessions(agent_id);
create index idx_sessions_status on creative_sessions(agent_id, status);

-- ============================================================
-- 4. CREATIVE ASSETS
-- Individual pieces created per platform
-- ============================================================
create table creative_assets (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references creative_sessions(id) on delete cascade,
  agent_id uuid not null references brand_agents(id) on delete cascade,

  -- Platform targeting
  platform text not null,
  -- "instagram_feed", "instagram_stories", "instagram_reels_cover",
  -- "instagram_carousel", "linkedin_post", "linkedin_article_cover",
  -- "linkedin_banner", "twitter_post", "twitter_header",
  -- "facebook_post", "facebook_cover", "facebook_ad",
  -- "youtube_thumbnail", "youtube_banner", "youtube_community",
  -- "tiktok_cover", "pinterest_pin", "whatsapp_status"

  -- Dimensions
  width int not null,
  height int not null,
  aspect_ratio text not null,            -- "1:1", "4:5", "9:16", "16:9", "1.91:1"

  -- Visual content
  base_image_url text,                   -- AI-generated base image
  final_image_url text,                  -- Composed final with text/elements
  layers jsonb not null default '[]'::jsonb,
  -- Fabric.js JSON serialization of all layers
  -- Array of layer objects that can be loaded back into the editor

  -- Text content
  caption text,                          -- Platform-specific caption
  hashtags text[] not null default '{}',
  cta text,                              -- Call to action text

  -- Generation metadata
  image_prompt text,                     -- Prompt used for AI image generation
  model_used text,                       -- "flux-kontext-pro", "gemini", etc.
  reference_images text[],               -- URLs of reference images used

  -- Status
  status text not null default 'draft' check (status in (
    'generating',     -- AI is generating
    'draft',          -- Generated, awaiting review
    'editing',        -- User is editing
    'approved',       -- User approved
    'exported'        -- Downloaded or published
  )),

  -- User feedback on this specific asset
  feedback text,                         -- "gostei", "muito poluido", etc.
  feedback_sentiment text check (feedback_sentiment in ('positive', 'negative', 'neutral')),

  -- Versioning (for refinements)
  version int not null default 1,
  parent_asset_id uuid references creative_assets(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assets_session on creative_assets(session_id);
create index idx_assets_agent on creative_assets(agent_id);
create index idx_assets_platform on creative_assets(agent_id, platform);
create index idx_assets_status on creative_assets(status);

-- ============================================================
-- 5. BRAND REFERENCES
-- Reference images the agent learns from
-- ============================================================
create table brand_references (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null references brand_agents(id) on delete cascade,

  -- Image
  image_url text not null,
  thumbnail_url text,                    -- Smaller version for UI

  -- AI analysis
  analysis text,                         -- AI description of the reference
  extracted_colors jsonb,                -- Colors found in the image
  extracted_fonts jsonb,                 -- Fonts detected (if any)
  extracted_layout jsonb,                -- Layout structure detected

  -- Classification
  tags text[] not null default '{}',     -- ["aprovado", "moodboard", "anti-referencia", "inspiracao"]
  is_anti_reference boolean not null default false,  -- "NUNCA fazer isso"
  source text,                           -- "upload", "url", "generated" (from our own tool)

  created_at timestamptz not null default now()
);

create index idx_references_agent on brand_references(agent_id);
create index idx_references_tags on brand_references using gin(tags);

-- ============================================================
-- 6. PLATFORM FORMATS (lookup table)
-- Standard sizes and specs per platform
-- ============================================================
create table platform_formats (
  id text primary key,                   -- "instagram_feed", "linkedin_post", etc.
  platform text not null,                -- "instagram", "linkedin", "twitter", etc.
  format_name text not null,             -- "Feed Post", "Story", "Thumbnail"
  width int not null,
  height int not null,
  aspect_ratio text not null,
  max_text_length int,                   -- Character limit for captions
  notes text,                            -- Platform-specific tips
  sort_order int not null default 0
);

-- Seed platform formats
insert into platform_formats (id, platform, format_name, width, height, aspect_ratio, max_text_length, notes, sort_order) values
  -- Instagram
  ('instagram_feed_square', 'instagram', 'Feed Post (1:1)', 1080, 1080, '1:1', 2200, 'Visual forte, pouco texto na imagem', 1),
  ('instagram_feed_portrait', 'instagram', 'Feed Post (4:5)', 1080, 1350, '4:5', 2200, 'Melhor engagement, mais espaco vertical', 2),
  ('instagram_stories', 'instagram', 'Stories', 1080, 1920, '9:16', null, 'Efemero, bold, CTAs diretos', 3),
  ('instagram_reels_cover', 'instagram', 'Reels Cover', 1080, 1920, '9:16', null, 'Thumbnail que gera clique', 4),
  ('instagram_carousel', 'instagram', 'Carrossel', 1080, 1080, '1:1', 2200, 'Narrativa em slides, educativo', 5),

  -- LinkedIn
  ('linkedin_post', 'linkedin', 'Post Image', 1200, 628, '1.91:1', 3000, 'Profissional, dados, graficos', 10),
  ('linkedin_article', 'linkedin', 'Article Cover', 1200, 644, '1.87:1', null, 'Editorial, clean', 11),
  ('linkedin_banner', 'linkedin', 'Company Banner', 1128, 191, '5.9:1', null, 'Institucional', 12),
  ('linkedin_carousel', 'linkedin', 'Carrossel PDF', 1080, 1080, '1:1', 3000, 'Formato documento/slide', 13),

  -- Twitter/X
  ('twitter_post', 'twitter', 'Post Image', 1600, 900, '16:9', 280, 'Impactante, direto', 20),
  ('twitter_header', 'twitter', 'Header', 1500, 500, '3:1', null, 'Branding, campanha', 21),

  -- Facebook
  ('facebook_post', 'facebook', 'Post Image', 1200, 630, '1.91:1', 63206, 'Similar ao LinkedIn', 30),
  ('facebook_cover', 'facebook', 'Cover Photo', 820, 312, '2.63:1', null, 'Vitrine da pagina', 31),
  ('facebook_stories', 'facebook', 'Stories', 1080, 1920, '9:16', null, 'Compartilhado com Instagram', 32),
  ('facebook_ad', 'facebook', 'Ad (Single)', 1080, 1080, '1:1', 125, 'Conversao, CTA forte', 33),

  -- YouTube
  ('youtube_thumbnail', 'youtube', 'Thumbnail', 1280, 720, '16:9', null, 'Rostos grandes, texto bold, alto contraste', 40),
  ('youtube_banner', 'youtube', 'Channel Banner', 2560, 1440, '16:9', null, 'Responsivo, zona segura central', 41),
  ('youtube_community', 'youtube', 'Community Post', 1200, 675, '16:9', 2000, 'Engagement, poll visual', 42),

  -- TikTok
  ('tiktok_cover', 'tiktok', 'Video Cover', 1080, 1920, '9:16', null, 'Thumbnail que para o scroll', 50),

  -- Pinterest
  ('pinterest_pin', 'pinterest', 'Pin', 1000, 1500, '2:3', 500, 'Vertical, aspiracional, texto legivel', 60),

  -- WhatsApp
  ('whatsapp_status', 'whatsapp', 'Status', 1080, 1920, '9:16', null, 'Pessoal, direto', 70);

-- ============================================================
-- 7. FONT LIBRARY
-- Fonts available + per-brand favorites
-- ============================================================
create table font_library (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid references brand_agents(id) on delete cascade,  -- null = global/system font

  family text not null,                  -- "Inter", "Playfair Display"
  category text not null,                -- "sans-serif", "serif", "display", "handwriting", "monospace"
  source text not null default 'google', -- "google", "custom", "system"
  url text,                              -- Google Fonts URL or custom font URL

  -- Per-brand usage
  role text,                             -- "heading", "body", "accent", null = available but no role
  is_favorite boolean not null default false,
  usage_count int not null default 0,    -- How many times used in assets

  created_at timestamptz not null default now()
);

create index idx_fonts_agent on font_library(agent_id);
create unique index idx_fonts_unique on font_library(agent_id, family) where agent_id is not null;

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_brand_agents_updated
  before update on brand_agents
  for each row execute function update_updated_at();

create trigger trg_sessions_updated
  before update on creative_sessions
  for each row execute function update_updated_at();

create trigger trg_assets_updated
  before update on creative_assets
  for each row execute function update_updated_at();

-- ============================================================
-- TRIGGERS: auto-increment counters on brand_agents
-- ============================================================
create or replace function increment_agent_sessions()
returns trigger as $$
begin
  update brand_agents set total_sessions = total_sessions + 1 where id = new.agent_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_session_created
  after insert on creative_sessions
  for each row execute function increment_agent_sessions();

create or replace function increment_agent_assets()
returns trigger as $$
begin
  update brand_agents set total_assets = total_assets + 1 where id = new.agent_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_asset_created
  after insert on creative_assets
  for each row execute function increment_agent_assets();

-- ============================================================
-- RLS (Row Level Security) — prepared but disabled for now
-- Will enable when auth is implemented
-- ============================================================
-- alter table brand_agents enable row level security;
-- alter table brand_memory enable row level security;
-- alter table creative_sessions enable row level security;
-- alter table creative_assets enable row level security;
-- alter table brand_references enable row level security;
-- alter table font_library enable row level security;
