-- In-app account deletion (Google Play "Account & data deletion" + DPDP Act).
-- SECURITY DEFINER so it bypasses RLS; execute granted ONLY to service_role,
-- so it can never be invoked by anon/authenticated clients via PostgREST rpc.
-- Deletes the user's rows from every base table that holds a user_id/owner_id
-- column (auto-adapts as new tables are added), then the profiles row.
-- Already applied to production via Supabase migration of the same name.
create or replace function public.delete_user_account(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if target is null then
    raise exception 'target user id required';
  end if;

  for r in
    select c.table_name, c.column_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name in ('user_id', 'owner_id')
      and t.table_type = 'BASE TABLE'
  loop
    execute format('delete from public.%I where %I = $1', r.table_name, r.column_name) using target;
  end loop;

  delete from public.profiles where id = target;
end;
$$;

revoke all on function public.delete_user_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;
