-- Migration 003: Remove workspace_id IS NULL fallback from RLS policies
-- This closes the gap where agents without workspace_id were visible to all users.
-- Run AFTER backfilling all existing agents with a workspace_id.

-- 1. Assign all agents with workspace_id = NULL to the first workspace found
--    (the owner of the oldest workspace gets all orphan agents)
update brand_agents
set workspace_id = (
  select w.id
  from workspaces w
  order by w.created_at asc
  limit 1
)
where workspace_id is null;

-- 2. Drop and recreate policies without the IS NULL fallback

drop policy if exists "Workspace brand agents" on brand_agents;
create policy "Workspace brand agents" on brand_agents
  for all using (workspace_id in (select get_user_workspace_ids()));

drop policy if exists "Workspace brand memory" on brand_memory;
create policy "Workspace brand memory" on brand_memory
  for all using (agent_id in (
    select id from brand_agents where workspace_id in (select get_user_workspace_ids())
  ));

drop policy if exists "Workspace sessions" on creative_sessions;
create policy "Workspace sessions" on creative_sessions
  for all using (workspace_id in (select get_user_workspace_ids()));

drop policy if exists "Workspace assets" on creative_assets;
create policy "Workspace assets" on creative_assets
  for all using (workspace_id in (select get_user_workspace_ids()));

drop policy if exists "Workspace references" on brand_references;
create policy "Workspace references" on brand_references
  for all using (agent_id in (
    select id from brand_agents where workspace_id in (select get_user_workspace_ids())
  ));

drop policy if exists "Workspace fonts" on font_library;
create policy "Workspace fonts" on font_library
  for all using (
    agent_id is null
    or agent_id in (
      select id from brand_agents where workspace_id in (select get_user_workspace_ids())
    )
  );
