# Social Manager + Auth System — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Evolve post.agent from a creative tool into a complete content ops platform with user auth, workspace isolation, social account connections (OAuth), content calendar, automated publishing, and batch approval flow.

**Architecture:** Supabase Auth for users, workspaces for multi-company isolation, OAuth flows for 5 platforms, calendar UI with AI-driven scheduling, cron-based publisher on VPS.

**Tech Stack:** Next.js 16, Supabase Auth + RLS, OAuth 2.0 (Meta, LinkedIn, Twitter, Pinterest), Vercel (frontend), VPS 148.230.109.112 (publisher cron), Resend (story notifications).

---

## 1. System Overview

### Two New Roles in post.agent
1. **Creative Director** (already built) — creates images, text overlays, multi-platform formats
2. **Social Manager** (new) — plans strategy, schedules posts, publishes automatically

### Key Flows
- User signs up → creates workspace → connects social accounts
- Creates Brand Agent → defines posting rules (frequency, times, categories)
- Social Manager AI distributes content across calendar
- User reviews batch → approves/rejects → Publisher executes on schedule
- Stories → email notification with image ready to post (no API available)

---

## 2. Auth System

### Provider
Supabase Auth (zero cost, already integrated)

### Login Methods
- Email + password
- Google OAuth (1-click)
- Magic link via email

### Data Model

```sql
-- profiles (extends Supabase Auth)
profiles (
  id uuid PK,
  user_id uuid FK → auth.users UNIQUE,
  name text,
  avatar_url text,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  created_at timestamptz DEFAULT now()
)

-- workspaces
workspaces (
  id uuid PK,
  owner_id uuid FK → profiles,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- workspace_members
workspace_members (
  workspace_id uuid FK → workspaces ON DELETE CASCADE,
  user_id uuid FK → profiles ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
)
```

### Isolation Rules
- brand_agents, creative_assets, creative_sessions, social_accounts, scheduled_posts all get workspace_id
- RLS policies filter everything by workspace_id
- User can belong to multiple workspaces (managing Lucky Level + Connect Cleaner)

---

## 3. Social Accounts (OAuth)

### Supported Platforms

| Platform | API | Feed Post | Stories | Reels/Video | Token Expiry |
|---|---|---|---|---|---|
| Instagram | Meta Graph API | Yes | **No** (notification) | Yes | 60 days |
| Facebook | Meta Graph API | Yes | **No** (notification) | Yes | 60 days |
| LinkedIn | Share API v2 | Yes | N/A | N/A | 60 days |
| Twitter/X | v2 API (Free) | Yes (1500/mo) | N/A | N/A | No expiry (OAuth 2.0 PKCE) |
| Pinterest | API v5 | Yes (Pins) | N/A | N/A | 30 days |

### OAuth Scopes Required

**Meta (Instagram + Facebook):**
- `instagram_basic`, `instagram_content_publish`
- `pages_manage_posts`, `pages_read_engagement`

**LinkedIn:**
- `w_member_social`, `r_liteprofile`

**Twitter/X:**
- `tweet.write`, `tweet.read`, `users.read`

**Pinterest:**
- `pins:write`, `boards:read`

### Data Model

```sql
social_accounts (
  id uuid PK,
  workspace_id uuid FK → workspaces ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'twitter', 'pinterest')),
  account_name text,
  account_id text,          -- platform-specific user/page ID
  avatar_url text,
  access_token text NOT NULL,   -- encrypted at rest
  refresh_token text,           -- encrypted at rest
  token_expires_at timestamptz,
  scopes text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
```

### Settings UI
```
Contas Conectadas
┌─────────────────────────────────────┐
│ ● Instagram  @luckylevel       [x] │
│ ● Facebook   Lucky Level Page  [x] │
│ ○ LinkedIn   Conectar →            │
│ ○ Twitter    Conectar →            │
│ ○ Pinterest  Conectar →            │
└─────────────────────────────────────┘
```

---

## 4. Posting Rules

```sql
posting_rules (
  id uuid PK,
  agent_id uuid FK → brand_agents ON DELETE CASCADE,
  workspace_id uuid FK → workspaces ON DELETE CASCADE,
  platform text NOT NULL,
  frequency int NOT NULL,           -- posts per period
  period text NOT NULL CHECK (period IN ('week', 'month')),
  preferred_days int[],             -- [1,3,5] = Mon/Wed/Fri
  preferred_time time NOT NULL,     -- "10:00"
  content_categories text[],        -- ["educativo", "promocional", "bastidores"]
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)
```

---

## 5. Content Calendar

### Data Model

```sql
scheduled_posts (
  id uuid PK,
  workspace_id uuid FK → workspaces ON DELETE CASCADE,
  agent_id uuid FK → brand_agents,
  asset_id uuid FK → creative_assets,
  social_account_id uuid FK → social_accounts,
  platform text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  caption text,
  hashtags text[],
  cta text,
  media_url text,                  -- final image/video URL
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'approved', 'queued', 'publishing', 'published', 'failed'
  )),
  published_at timestamptz,
  published_id text,               -- post ID on the platform
  error_log text,
  retry_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

publish_log (
  id uuid PK,
  scheduled_post_id uuid FK → scheduled_posts ON DELETE CASCADE,
  action text NOT NULL,            -- 'attempt', 'success', 'failure', 'retry'
  status int,                      -- HTTP status code
  response jsonb,                  -- API response
  created_at timestamptz DEFAULT now()
)
```

### Calendar UI (`/calendar`)

- Month/Week toggle view
- Cards showing: thumbnail, platform icon, time, status badge
- Click card → edit caption, change time, swap creative
- Drag to reschedule

### Batch Review UI

- Grid of all pending posts (status = draft)
- Each card: thumbnail + caption preview + platform + scheduled time
- Per-card: Approve / Reject / Edit buttons
- Top bar: "Approve All" / "Reject All" / count badge
- Approved → status changes to `queued`

---

## 6. Social Manager AI Flow

1. User defines posting_rules per Brand Agent
2. User says "Planeja minha semana" or "Monta o calendario de abril"
3. Social Manager AI:
   - Reads posting_rules (frequency, days, times, categories)
   - Checks existing creative_assets (reuse approved content)
   - Generates new criativos if needed (via Creative Director)
   - Writes captions adapted per platform
   - Creates scheduled_posts entries with status `draft`
4. User sees batch review → approves
5. Approved posts → `queued`
6. Publisher cron picks up and publishes

---

## 7. Publisher Engine

**Location:** VPS 148.230.109.112 (already running lucky-level-agents)

**Cron:** Every minute, checks `scheduled_posts` where `status = 'queued' AND scheduled_at <= now()`

**Per-platform publishing:**

- **Instagram Feed:** Upload image → Create media container → Publish
- **Facebook Feed:** Post to Page feed with image
- **LinkedIn:** Create share with image upload
- **Twitter:** Upload media → Create tweet with media_id
- **Pinterest:** Create Pin with image URL
- **Stories (IG/FB):** Send email via Resend with image attached + "Poste agora!" CTA

**Error handling:**
- On failure: set status = `failed`, log to publish_log, increment retry_count
- Auto-retry up to 3 times with 5min backoff
- After 3 failures: notify user via email

**Token refresh:**
- Before publishing, check `token_expires_at`
- If expiring in < 7 days, refresh automatically
- If refresh fails, mark social_account as `is_active = false`, notify user

---

## 8. New Pages/Routes

| Route | Purpose |
|---|---|
| `/login` | Auth page (login/signup) |
| `/calendar` | Content calendar (month/week view) |
| `/calendar/review` | Batch approval screen |
| `/settings` | Workspace settings |
| `/settings/accounts` | Connected social accounts |
| `/settings/rules` | Posting rules per agent |
| `/api/auth/callback/[platform]` | OAuth callback handlers |
| `/api/social-accounts` | CRUD social accounts |
| `/api/scheduled-posts` | CRUD scheduled posts |
| `/api/posting-rules` | CRUD posting rules |
| `/api/publish` | Manual publish trigger |

---

## 9. Implementation Phases

### Phase 1: Auth + Workspaces
- Supabase Auth setup, login/signup pages
- profiles + workspaces tables + RLS
- Add workspace_id to existing tables (brand_agents, creative_assets, etc.)
- Middleware to protect routes

### Phase 2: Social Accounts (OAuth)
- OAuth flows for Meta, LinkedIn, Twitter, Pinterest
- Callback handlers + token storage
- Settings UI for connected accounts
- Token refresh mechanism

### Phase 3: Calendar + Posting Rules
- posting_rules table + UI
- scheduled_posts table
- Calendar page (month/week view)
- Batch review page

### Phase 4: Social Manager AI
- Chat integration: "Planeja minha semana"
- AI reads rules + assets → generates calendar
- Caption adaptation per platform
- Auto-create scheduled_posts

### Phase 5: Publisher Engine
- Cron job on VPS
- Platform-specific publish functions
- Error handling + retry logic
- Story notification via Resend
- Token refresh automation

### Phase 6: Landing Page
- Public LP at `/` explaining the product
- App moves to `/app`
- Pricing, features, CTA
