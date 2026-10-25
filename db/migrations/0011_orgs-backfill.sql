-- M2 backfill: one "Personal" org per existing user, owner membership,
-- default quota row, and org_id on every session. Runs as the migration
-- role (superuser locally; bypassrls on hosted Supabase) so RLS does not
-- apply to the backfill itself. Idempotent: only users/sessions that are
-- missing org coverage are touched, so re-running after a partial apply
-- completes the job.
do $func$
declare
  u uuid;
  new_org uuid;
begin
  -- Users that own sessions but no org yet (session owners are the rows the
  -- NOT NULL in 0012 actually constrains).
  for u in
    select distinct s.user_id from public.sessions s
    where s.org_id is null
    union
    select id from auth.users
  loop
    if not exists (
      select 1 from public.org_members m where m.user_id = u
    ) then
      insert into public.organizations (id, name, slug, created_by)
      values (
        gen_random_uuid(),
        'Personal',
        'u-' || substr(md5(u::text || random()::text || clock_timestamp()::text), 1, 8),
        u
      )
      returning id into new_org;

      insert into public.org_members (org_id, user_id, role)
      values (new_org, u, 'owner');
      -- Default quota row minted by the 0014 org_quotas_bootstrap trigger.
    end if;

    update public.sessions
       set org_id = (
         select m.org_id from public.org_members m
         where m.user_id = u
         order by m.joined_at asc
         limit 1
       )
     where user_id = u and org_id is null;
  end loop;
end
$func$;
