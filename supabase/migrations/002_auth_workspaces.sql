-- ============================================================
-- Migration 002: Auth System + Workspaces
-- ============================================================

-- 1. PROFILES (extends Supabase Auth users)
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_user on profiles(user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. WORKSPACES
create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspaces_owner on workspaces(owner_id);
create index if not exists idx_workspaces_slug on workspaces(slug);

-- 3. WORKSPACE MEMBERS
create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists idx_wm_user on workspace_members(user_id);

-- Auto-create workspace on profile creation
create or replace function handle_new_profile()
returns trigger as $$
declare
  ws_id uuid;
  ws_slug text;
begin
  ws_slug := lower(regexp_replace(coalesce(new.name, 'workspace'), '[^a-z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8);

  insert into public.workspaces (owner_id, name, slug)
  values (new.id, coalesce(new.name, 'Meu Workspace'), ws_slug)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created on profiles;
create trigger on_profile_created
  after insert on profiles
  for each row execute function handle_new_profile();

-- 4. ADD workspace_id TO EXISTING TABLES (if not exists)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'brand_agents' and column_name = 'workspace_id') then
    alter table brand_agents add column workspace_id uuid references workspaces(id) on delete cascade;
    create index idx_brand_agents_ws on brand_agents(workspace_id);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'creative_sessions' and column_name = 'workspace_id') then
    alter table creative_sessions add column workspace_id uuid references workspaces(id) on delete cascade;
    create index idx_sessions_ws on creative_sessions(workspace_id);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'creative_assets' and column_name = 'workspace_id') then
    alter table creative_assets add column workspace_id uuid references workspaces(id) on delete cascade;
    create index idx_assets_ws on creative_assets(workspace_id);
  end if;
end $$;

-- 5. RLS POLICIES
alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table brand_agents enable row level security;
alter table brand_memory enable row level security;
alter table creative_sessions enable row level security;
alter table creative_assets enable row level security;
alter table brand_references enable row level security;
alter table font_library enable row level security;

-- Helper: get workspace IDs for current user
create or replace function get_user_workspace_ids()
returns setof uuid as $$
  select wm.workspace_id
  from workspace_members wm
  join profiles p on p.id = wm.user_id
  where p.user_id = auth.uid()
$$ language sql security definer stable;

-- Drop existing policies first (idempotent)
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
    and policyname like 'Users %' or policyname like 'Members %' or policyname like 'Owner %' or policyname like 'Workspace %' or policyname like 'Public %'
  loop
    execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- Profiles: users see only their own
create policy "Users view own profile" on profiles
  for select using (user_id = auth.uid());
create policy "Users update own profile" on profiles
  for update using (user_id = auth.uid());

-- Workspaces: members can view
create policy "Members view workspace" on workspaces
  for select using (id in (select get_user_workspace_ids()));
create policy "Owner manages workspace" on workspaces
  for all using (owner_id in (select id from profiles where user_id = auth.uid()));

-- Workspace members: members can view
create policy "Members view members" on workspace_members
  for select using (workspace_id in (select get_user_workspace_ids()));

-- Brand agents: workspace isolation
create policy "Workspace brand agents" on brand_agents
  for all using (workspace_id in (select get_user_workspace_ids()) or workspace_id is null);

-- Brand memory: via agent's workspace
create policy "Workspace brand memory" on brand_memory
  for all using (agent_id in (
    select id from brand_agents where workspace_id in (select get_user_workspace_ids()) or workspace_id is null
  ));

-- Creative sessions: workspace isolation
create policy "Workspace sessions" on creative_sessions
  for all using (workspace_id in (select get_user_workspace_ids()) or workspace_id is null);

-- Creative assets: workspace isolation
create policy "Workspace assets" on creative_assets
  for all using (workspace_id in (select get_user_workspace_ids()) or workspace_id is null);

-- Brand references: via agent's workspace
create policy "Workspace references" on brand_references
  for all using (agent_id in (
    select id from brand_agents where workspace_id in (select get_user_workspace_ids()) or workspace_id is null
  ));

-- Font library: global (agent_id null) or workspace
create policy "Workspace fonts" on font_library
  for all using (
    agent_id is null
    or agent_id in (
      select id from brand_agents where workspace_id in (select get_user_workspace_ids()) or workspace_id is null
    )
  );

-- Platform formats: public read for everyone
create policy "Public platform formats" on platform_formats
  for select using (true);

-- Updated_at trigger for profiles
create trigger trg_profiles_updated
  before update on profiles
  for each row execute function update_updated_at();
