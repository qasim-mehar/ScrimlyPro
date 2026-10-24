-- M1 multi-tenancy: auth shim (local no-GoTrue mode), profiles, RLS on every
-- table. On a hosted Supabase project the auth schema/role already exist and
-- every conditional block below is a no-op — see the cloud cut-over checklist
-- in docs/reports/M1-implementation-report.md.
--
-- RLS LAW (M1 brief §5.5): enable + FORCE on every tenant table; policies
-- always pair USING with WITH CHECK; default deny; no `true`/`1=1` shortcuts.
-- Global reference tables: none exist (schema is fully session-scoped).

--> statement-breakpoint
-- 1. Local stand-ins for the Supabase auth layer (skipped on hosted Supabase
--    where the real objects exist). The stand-in table gives user_id FKs and
--    the profile trigger something real to bind to in local/CI runs.
do $shim$
begin
  if to_regclass('auth.users') is null then
    create schema if not exists auth;
    create table auth.users (
      id uuid primary key,
      email text,
      created_at timestamptz not null default now()
    );
    create or replace function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid $$;
    create or replace function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
  end if;
end
$shim$;

--> statement-breakpoint
-- 2. The `authenticated` role (exists on hosted Supabase). Policies target it;
--    withUserDb set_config('role','authenticated') activates them.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

--> statement-breakpoint
-- 3. profiles (per ERD §6): id = auth.users.id, role reserved for M3.
create table if not exists public.profiles (
  id uuid primary key,
  email text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

--> statement-breakpoint
-- 4. Profile creation trigger on auth.users (C.4) + role-escalation guard (C.5).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.guard_profile_role() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role
     and current_setting('role', true) = 'authenticated' then
    raise exception 'profile.role is managed by admins only';
  end if;
  return new;
end $$;

drop trigger if exists profile_role_guard on public.profiles;
create trigger profile_role_guard before update on public.profiles
  for each row execute function public.guard_profile_role();

--> statement-breakpoint
-- 5. Tenant root: sessions.
alter table public.sessions enable row level security;
alter table public.sessions force row level security;

create policy tenant_select_sessions on public.sessions
  for select to authenticated
  using (auth.uid() = user_id);
create policy tenant_insert_sessions on public.sessions
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy tenant_update_sessions on public.sessions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy tenant_delete_sessions on public.sessions
  for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists sessions_user_idx on public.sessions (user_id);

--> statement-breakpoint
-- 6. Child tables — ownership walks the FK chain to sessions.user_id (C.2).
alter table public.teams enable row level security;
alter table public.teams force row level security;
create policy tenant_select_teams on public.teams
  for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = teams.session_id and s.user_id = auth.uid()
  ));
create policy tenant_insert_teams on public.teams
  for insert to authenticated
  with check (exists (
    select 1 from public.sessions s
    where s.id = teams.session_id and s.user_id = auth.uid()
  ));
create policy tenant_update_teams on public.teams
  for update to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = teams.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = teams.session_id and s.user_id = auth.uid()
  ));
create policy tenant_delete_teams on public.teams
  for delete to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = teams.session_id and s.user_id = auth.uid()
  ));

--> statement-breakpoint
alter table public.rosters enable row level security;
alter table public.rosters force row level security;
create policy tenant_select_rosters on public.rosters
  for select to authenticated
  using (exists (
    select 1 from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = rosters.team_id and s.user_id = auth.uid()
  ));
create policy tenant_insert_rosters on public.rosters
  for insert to authenticated
  with check (exists (
    select 1 from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = rosters.team_id and s.user_id = auth.uid()
  ));
create policy tenant_update_rosters on public.rosters
  for update to authenticated
  using (exists (
    select 1 from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = rosters.team_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = rosters.team_id and s.user_id = auth.uid()
  ));
create policy tenant_delete_rosters on public.rosters
  for delete to authenticated
  using (exists (
    select 1 from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = rosters.team_id and s.user_id = auth.uid()
  ));

--> statement-breakpoint
alter table public.matches enable row level security;
alter table public.matches force row level security;
create policy tenant_select_matches on public.matches
  for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = matches.session_id and s.user_id = auth.uid()
  ));
create policy tenant_insert_matches on public.matches
  for insert to authenticated
  with check (exists (
    select 1 from public.sessions s
    where s.id = matches.session_id and s.user_id = auth.uid()
  ));
create policy tenant_update_matches on public.matches
  for update to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = matches.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = matches.session_id and s.user_id = auth.uid()
  ));
create policy tenant_delete_matches on public.matches
  for delete to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = matches.session_id and s.user_id = auth.uid()
  ));

--> statement-breakpoint
alter table public.match_results enable row level security;
alter table public.match_results force row level security;
create policy tenant_select_match_results on public.match_results
  for select to authenticated
  using (exists (
    select 1 from public.matches m
    join public.sessions s on s.id = m.session_id
    where m.id = match_results.match_id and s.user_id = auth.uid()
  ));
create policy tenant_insert_match_results on public.match_results
  for insert to authenticated
  with check (exists (
    select 1 from public.matches m
    join public.sessions s on s.id = m.session_id
    where m.id = match_results.match_id and s.user_id = auth.uid()
  ));
create policy tenant_update_match_results on public.match_results
  for update to authenticated
  using (exists (
    select 1 from public.matches m
    join public.sessions s on s.id = m.session_id
    where m.id = match_results.match_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.matches m
    join public.sessions s on s.id = m.session_id
    where m.id = match_results.match_id and s.user_id = auth.uid()
  ));
create policy tenant_delete_match_results on public.match_results
  for delete to authenticated
  using (exists (
    select 1 from public.matches m
    join public.sessions s on s.id = m.session_id
    where m.id = match_results.match_id and s.user_id = auth.uid()
  ));

--> statement-breakpoint
alter table public.mvp_lists enable row level security;
alter table public.mvp_lists force row level security;
create policy tenant_select_mvp_lists on public.mvp_lists
  for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = mvp_lists.session_id and s.user_id = auth.uid()
  ));
create policy tenant_insert_mvp_lists on public.mvp_lists
  for insert to authenticated
  with check (exists (
    select 1 from public.sessions s
    where s.id = mvp_lists.session_id and s.user_id = auth.uid()
  ));
create policy tenant_update_mvp_lists on public.mvp_lists
  for update to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = mvp_lists.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = mvp_lists.session_id and s.user_id = auth.uid()
  ));
create policy tenant_delete_mvp_lists on public.mvp_lists
  for delete to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = mvp_lists.session_id and s.user_id = auth.uid()
  ));

--> statement-breakpoint
-- 7. profiles RLS: self-rows only; no delete policy (default deny); role
--    changes blocked by the guard trigger for `authenticated`.
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

--> statement-breakpoint
-- 8. Table grants for `authenticated` (hosted Supabase grants these via
--    default privileges; local stand-ins need them explicitly). Row filtering
--    remains RLS's job — grants only open the table, policies scope the rows.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
