CREATE TABLE "org_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text,
	"role" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "org_quotas" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"max_sessions" integer DEFAULT 100 NOT NULL,
	"monthly_ocr_calls" integer DEFAULT 300 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "share_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text DEFAULT 'ocr' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "org_invites" ADD CONSTRAINT "org_invites_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_quotas" ADD CONSTRAINT "org_quotas_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_events_org_month_idx" ON "usage_events" USING btree ("org_id","created_at");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

-- ============================================================
-- M2 RLS (Lane B): member-scoped policies on the new tables + the sessions
-- policy switch from auth.uid() = user_id to org membership.
-- RLS LAW: enable + FORCE on every new table; policies pair USING with
-- WITH CHECK; default deny; no `true`/`1=1` shortcuts; policies never
-- contain `auth.uid() is null`.
--
-- org_role() is SECURITY DEFINER so policies can consult org_members
-- without recursive RLS on that table. It returns 'owner' | 'admin' |
-- 'member' | NULL.
-- ============================================================
--> statement-breakpoint
create or replace function public.org_role(p_user uuid, p_org uuid)
returns text language sql stable security definer set search_path = public as $func$
  select role from public.org_members
  where user_id = p_user and org_id = p_org
$func$;
--> statement-breakpoint
-- RLS-free existence check for the create-org bootstrap: a brand-new creator
-- is not yet a member, so org_select_organizations hides their own org row
-- from the plain EXISTS in org_member_insert's WITH CHECK. SECURITY DEFINER
-- closes the chicken-and-egg without opening the org list to non-members.
create or replace function public.is_org_creator(p_user uuid, p_org uuid)
returns boolean language sql stable security definer set search_path = public as $func$
  select exists (
    select 1 from public.organizations
    where id = p_org and created_by = p_user
  )
$func$;

--> statement-breakpoint
-- Single-use invite acceptance. SECURITY DEFINER because the invitee has no
-- org role yet (org_invites is admin-readable only). The UPDATE takes the row
-- lock: two concurrent accepts race, exactly one gets a row back, the other
-- gets NULL → "invalid/expired/already used" (no existence leakage: unknown
-- hash, expired, and used are indistinguishable). Returns the org id or NULL.
create or replace function public.accept_org_invite(p_token_hash text)
returns uuid language plpgsql security definer set search_path = public as $func$
declare
  v_org uuid;
  v_role text;
begin
  update public.org_invites
     set accepted_at = now()
   where token_hash = p_token_hash
     and accepted_at is null
     and expires_at > now()
   returning org_id, role into v_org, v_role;
  if v_org is null then
    return null;
  end if;
  insert into public.org_members (org_id, user_id, role)
  values (v_org, auth.uid(), coalesce(v_role, 'member'))
  on conflict (org_id, user_id) do nothing;
  return v_org;
end
$func$;
--> statement-breakpoint
-- organizations
alter table public.organizations enable row level security;
alter table public.organizations force row level security;
create policy org_select_organizations on public.organizations
  for select to authenticated
  using (public.org_role(auth.uid(), id) is not null);
create policy org_insert_organizations on public.organizations
  for insert to authenticated
  with check (created_by = auth.uid());
create policy org_update_organizations on public.organizations
  for update to authenticated
  using (public.org_role(auth.uid(), id) = 'owner')
  with check (public.org_role(auth.uid(), id) = 'owner');
create policy org_delete_organizations on public.organizations
  for delete to authenticated
  using (public.org_role(auth.uid(), id) = 'owner');
--> statement-breakpoint
-- org_members: creator bootstraps their own owner row in the create-org tx;
-- admins manage everyone else. Last-owner protection is app-layer
-- (lib/orgs/members.ts) on top of these policies.
alter table public.org_members enable row level security;
alter table public.org_members force row level security;
create policy org_member_select on public.org_members
  for select to authenticated
  using (public.org_role(auth.uid(), org_id) is not null);
create policy org_member_insert on public.org_members
  for insert to authenticated
  with check (
    (
      role = 'owner'
      and user_id = auth.uid()
      and public.is_org_creator(auth.uid(), org_id)
    )
    or public.org_role(auth.uid(), org_id) in ('owner', 'admin')
  );
create policy org_member_update on public.org_members
  for update to authenticated
  using (public.org_role(auth.uid(), org_id) in ('owner', 'admin'))
  with check (public.org_role(auth.uid(), org_id) in ('owner', 'admin'));
create policy org_member_delete on public.org_members
  for delete to authenticated
  using (public.org_role(auth.uid(), org_id) in ('owner', 'admin'));
--> statement-breakpoint
-- org_invites: admin-managed; invitees never read rows directly (acceptance
-- goes through public.accept_org_invite above).
alter table public.org_invites enable row level security;
alter table public.org_invites force row level security;
create policy org_invite_select on public.org_invites
  for select to authenticated
  using (public.org_role(auth.uid(), org_id) in ('owner', 'admin'));
create policy org_invite_insert on public.org_invites
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.org_role(auth.uid(), org_id) in ('owner', 'admin')
  );
create policy org_invite_update on public.org_invites
  for update to authenticated
  using (public.org_role(auth.uid(), org_id) in ('owner', 'admin'))
  with check (public.org_role(auth.uid(), org_id) in ('owner', 'admin'));
create policy org_invite_delete on public.org_invites
  for delete to authenticated
  using (public.org_role(auth.uid(), org_id) in ('owner', 'admin'));
--> statement-breakpoint
-- org_quotas: readable by members (quota banners); mutable by owners only.
-- No delete policy: default deny — quota rows live/die with the org cascade.
alter table public.org_quotas enable row level security;
alter table public.org_quotas force row level security;
create policy org_quota_select on public.org_quotas
  for select to authenticated
  using (public.org_role(auth.uid(), org_id) is not null);
create policy org_quota_insert on public.org_quotas
  for insert to authenticated
  with check (public.org_role(auth.uid(), org_id) = 'owner');
create policy org_quota_update on public.org_quotas
  for update to authenticated
  using (public.org_role(auth.uid(), org_id) = 'owner')
  with check (public.org_role(auth.uid(), org_id) = 'owner');
--> statement-breakpoint
-- share_links: member+ create/read within the owning org's sessions;
-- revocation via update (revoked_at) or delete, scoped to the org the same way.
alter table public.share_links enable row level security;
alter table public.share_links force row level security;
create policy share_select_links on public.share_links
  for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = share_links.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy share_insert_links on public.share_links
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.sessions s
      where s.id = share_links.session_id
        and public.org_role(auth.uid(), s.org_id) is not null
    )
  );
create policy share_update_links on public.share_links
  for update to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = share_links.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = share_links.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy share_delete_links on public.share_links
  for delete to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = share_links.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
--> statement-breakpoint
-- usage_events: append-only usage meter (OCR calls). Members insert their
-- own rows; no update/delete policies (default deny).
alter table public.usage_events enable row level security;
alter table public.usage_events force row level security;
create policy usage_select_events on public.usage_events
  for select to authenticated
  using (public.org_role(auth.uid(), org_id) is not null);
create policy usage_insert_events on public.usage_events
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.org_role(auth.uid(), org_id) is not null
  );
--> statement-breakpoint
-- sessions: ownership policy switches from auth.uid() = user_id to org
-- membership. Delete is tighter (admin+) than the other verbs because there
-- is no member-level delete feature in the app; org deletion still cascades.
alter table public.sessions enable row level security;
alter table public.sessions force row level security;

drop policy if exists tenant_select_sessions on public.sessions;
drop policy if exists tenant_insert_sessions on public.sessions;
drop policy if exists tenant_update_sessions on public.sessions;
drop policy if exists tenant_delete_sessions on public.sessions;

create policy tenant_select_sessions on public.sessions
  for select to authenticated
  using (public.org_role(auth.uid(), org_id) is not null);
create policy tenant_insert_sessions on public.sessions
  for insert to authenticated
  with check (public.org_role(auth.uid(), org_id) is not null);
create policy tenant_update_sessions on public.sessions
  for update to authenticated
  using (public.org_role(auth.uid(), org_id) is not null)
  with check (public.org_role(auth.uid(), org_id) is not null);
create policy tenant_delete_sessions on public.sessions
  for delete to authenticated
  using (public.org_role(auth.uid(), org_id) in ('owner', 'admin'));

create index if not exists sessions_org_idx on public.sessions (org_id);
--> statement-breakpoint
-- Child tables: the C.2 EXISTS chains now walk to sessions.org_id and check
-- membership (one hop via org_role). Children keep member-level delete so
-- match unlock (match_results purge) works for any member running a session.
alter table public.teams enable row level security;
alter table public.teams force row level security;
drop policy if exists tenant_select_teams on public.teams;
drop policy if exists tenant_insert_teams on public.teams;
drop policy if exists tenant_update_teams on public.teams;
drop policy if exists tenant_delete_teams on public.teams;
create policy tenant_select_teams on public.teams
  for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = teams.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_insert_teams on public.teams
  for insert to authenticated
  with check (exists (
    select 1 from public.sessions s
    where s.id = teams.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_update_teams on public.teams
  for update to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = teams.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = teams.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_delete_teams on public.teams
  for delete to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = teams.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
--> statement-breakpoint
alter table public.rosters enable row level security;
alter table public.rosters force row level security;
drop policy if exists tenant_select_rosters on public.rosters;
drop policy if exists tenant_insert_rosters on public.rosters;
drop policy if exists tenant_update_rosters on public.rosters;
drop policy if exists tenant_delete_rosters on public.rosters;
create policy tenant_select_rosters on public.rosters
  for select to authenticated
  using (exists (
    select 1 from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = rosters.team_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_insert_rosters on public.rosters
  for insert to authenticated
  with check (exists (
    select 1 from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = rosters.team_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_update_rosters on public.rosters
  for update to authenticated
  using (exists (
    select 1 from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = rosters.team_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ))
  with check (exists (
    select 1 from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = rosters.team_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_delete_rosters on public.rosters
  for delete to authenticated
  using (exists (
    select 1 from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = rosters.team_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
--> statement-breakpoint
alter table public.matches enable row level security;
alter table public.matches force row level security;
drop policy if exists tenant_select_matches on public.matches;
drop policy if exists tenant_insert_matches on public.matches;
drop policy if exists tenant_update_matches on public.matches;
drop policy if exists tenant_delete_matches on public.matches;
create policy tenant_select_matches on public.matches
  for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = matches.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_insert_matches on public.matches
  for insert to authenticated
  with check (exists (
    select 1 from public.sessions s
    where s.id = matches.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_update_matches on public.matches
  for update to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = matches.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = matches.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_delete_matches on public.matches
  for delete to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = matches.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
--> statement-breakpoint
alter table public.match_results enable row level security;
alter table public.match_results force row level security;
drop policy if exists tenant_select_match_results on public.match_results;
drop policy if exists tenant_insert_match_results on public.match_results;
drop policy if exists tenant_update_match_results on public.match_results;
drop policy if exists tenant_delete_match_results on public.match_results;
create policy tenant_select_match_results on public.match_results
  for select to authenticated
  using (exists (
    select 1 from public.matches m
    join public.sessions s on s.id = m.session_id
    where m.id = match_results.match_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_insert_match_results on public.match_results
  for insert to authenticated
  with check (exists (
    select 1 from public.matches m
    join public.sessions s on s.id = m.session_id
    where m.id = match_results.match_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_update_match_results on public.match_results
  for update to authenticated
  using (exists (
    select 1 from public.matches m
    join public.sessions s on s.id = m.session_id
    where m.id = match_results.match_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ))
  with check (exists (
    select 1 from public.matches m
    join public.sessions s on s.id = m.session_id
    where m.id = match_results.match_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_delete_match_results on public.match_results
  for delete to authenticated
  using (exists (
    select 1 from public.matches m
    join public.sessions s on s.id = m.session_id
    where m.id = match_results.match_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
--> statement-breakpoint
alter table public.mvp_lists enable row level security;
alter table public.mvp_lists force row level security;
drop policy if exists tenant_select_mvp_lists on public.mvp_lists;
drop policy if exists tenant_insert_mvp_lists on public.mvp_lists;
drop policy if exists tenant_update_mvp_lists on public.mvp_lists;
drop policy if exists tenant_delete_mvp_lists on public.mvp_lists;
create policy tenant_select_mvp_lists on public.mvp_lists
  for select to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = mvp_lists.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_insert_mvp_lists on public.mvp_lists
  for insert to authenticated
  with check (exists (
    select 1 from public.sessions s
    where s.id = mvp_lists.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_update_mvp_lists on public.mvp_lists
  for update to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = mvp_lists.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ))
  with check (exists (
    select 1 from public.sessions s
    where s.id = mvp_lists.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
create policy tenant_delete_mvp_lists on public.mvp_lists
  for delete to authenticated
  using (exists (
    select 1 from public.sessions s
    where s.id = mvp_lists.session_id
      and public.org_role(auth.uid(), s.org_id) is not null
  ));
--> statement-breakpoint
-- auth.users FKs for the new actor columns (auth lives outside this drizzle
-- schema — same convention as sessions.user_id, see M1). Cascade mirrors the
-- memberships: deleting an auth user removes their orgs/memberships/links.
alter table public.organizations
  add constraint organizations_created_by_auth_fk
  foreign key (created_by) references auth.users (id) on delete cascade;
alter table public.org_members
  add constraint org_members_user_auth_fk
  foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.org_invites
  add constraint org_invites_created_by_auth_fk
  foreign key (created_by) references auth.users (id) on delete cascade;
alter table public.share_links
  add constraint share_links_created_by_auth_fk
  foreign key (created_by) references auth.users (id) on delete cascade;
alter table public.usage_events
  add constraint usage_events_user_auth_fk
  foreign key (user_id) references auth.users (id) on delete cascade;
--> statement-breakpoint
-- Re-grant (0002's default privileges already cover new tables; explicit
-- here so the policy set is self-contained). Row filtering stays RLS's job.
grant select, insert, update, delete on all tables in schema public to authenticated;
