-- Migration: family_members_email_rpc
-- Adds a SECURITY DEFINER RPC that joins family_members with auth.users
-- so the client can read member emails without direct access to auth schema.
-- Only members of the group can call this (enforced by the WHERE clause).

create or replace function get_family_members_with_email(p_group_id uuid)
returns table (
  id           uuid,
  group_id     uuid,
  user_id      uuid,
  role         text,
  joined_at    timestamptz,
  display_name text,
  email        text
)
language sql
security definer
stable
set search_path = public, auth
as $$
  select
    fm.id,
    fm.group_id,
    fm.user_id,
    fm.role,
    fm.joined_at,
    coalesce(p.display_name, split_part(u.email, '@', 1)) as display_name,
    u.email
  from public.family_members fm
  -- join auth.users for the canonical email
  join auth.users u on u.id = fm.user_id
  -- left-join profiles for optional display_name override
  left join public.profiles p on p.id = fm.user_id
  where fm.group_id = p_group_id
    -- Security: caller must be a member of this group
    and exists (
      select 1 from public.family_members caller
      where caller.group_id = p_group_id
        and caller.user_id  = auth.uid()
    )
  order by fm.joined_at;
$$;

-- Grant execute to authenticated users (RLS-equivalent is the inner exists check)
grant execute on function get_family_members_with_email(uuid) to authenticated;

-- Also ensure profiles table has email column (mirror for display)
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;

-- Sync email on first profile creation via trigger
create or replace function sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email
    where public.profiles.email is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_email on auth.users;
create trigger on_auth_user_created_sync_email
  after insert on auth.users
  for each row execute function sync_profile_email();
