CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"effective_user_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid,
	"flag" text NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impersonation_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"target_email" text NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_subject_flag_uq" ON "feature_flags" USING btree ("subject_type","subject_id","flag");
-- ============================================================
-- M3: FKs to auth.users, RLS, and the two security-definer
-- helpers the request path is allowed to call (kill-switch
-- check + auth-event audit). Everything below is idempotent
-- in shape but runs once like every drizzle migration.
-- ============================================================

--> statement-breakpoint
-- FKs (declared here, not in drizzle, mirroring migration 0002's
-- auth.users-referencing pattern — auth.users is not a drizzle table).
alter table public.audit_log
  add constraint audit_log_actor_fkey foreign key (actor_user_id) references auth.users (id);
alter table public.audit_log
  add constraint audit_log_effective_fkey foreign key (effective_user_id) references auth.users (id);
alter table public.feature_flags
  add constraint feature_flags_updated_by_fkey foreign key (updated_by) references auth.users (id);
alter table public.impersonation_sessions
  add constraint impersonation_admin_fkey foreign key (admin_user_id) references auth.users (id);
alter table public.impersonation_sessions
  add constraint impersonation_target_fkey foreign key (target_user_id) references auth.users (id);

--> statement-breakpoint
-- audit_log: APPEND-ONLY. Insert: authenticated may insert only their own
-- rows (actor_user_id = auth.uid()). Select: admin role only, evaluated as
-- a doctrine initplan per the M3 brief. NO update/delete policies exist at
-- all — for any role — so UPDATE/DELETE return zero rows under RLS.
alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

create policy audit_insert_own on public.audit_log
  for insert to authenticated
  with check (actor_user_id = auth.uid());
create policy audit_select_admin on public.audit_log
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

--> statement-breakpoint
-- feature_flags: admin-only read/write at the policy level. Users CANNOT
-- read their own flag rows (the kill-switch check must not be observable
-- or spoofable from the tenant side); the request path consults the
-- security-definer is_user_disabled() below instead.
alter table public.feature_flags enable row level security;
alter table public.feature_flags force row level security;

create policy flags_select_admin on public.feature_flags
  for select to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy flags_insert_admin on public.feature_flags
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy flags_update_admin on public.feature_flags
  for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy flags_delete_admin on public.feature_flags
  for delete to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

--> statement-breakpoint
-- impersonation_sessions: the signed cookie resolves to a row here. The
-- cookie holder IS the admin's browser, so select is granted to the
-- admin of the row, the target (they are entitled to know), and any
-- admin. Writes go through the service-role path only (admin routes).
alter table public.impersonation_sessions enable row level security;
alter table public.impersonation_sessions force row level security;

create policy imp_select_involved on public.impersonation_sessions
  for select to authenticated
  using (
    admin_user_id = auth.uid()
    or target_user_id = auth.uid()
    or (select role from public.profiles where id = auth.uid()) = 'admin'
  );
create policy imp_insert_admin on public.impersonation_sessions
  for insert to authenticated
  with check (
    admin_user_id = auth.uid()
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );
create policy imp_update_admin on public.impersonation_sessions
  for update to authenticated
  using (admin_user_id = auth.uid())
  with check (admin_user_id = auth.uid());

--> statement-breakpoint
-- Kill-switch check for the request path: SECURITY DEFINER so the
-- authenticated caller can evaluate the reserved `disabled` marker
-- without feature_flags being readable. Presence of the row = disabled
-- (fail-closed semantics documented in the M3 report §5).
create function public.is_user_disabled(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.feature_flags
    where subject_type = 'user'
      and subject_id = p_user_id
      and flag = 'disabled'
  )
$$;

revoke execute on function public.is_user_disabled(uuid) from public;
grant execute on function public.is_user_disabled(uuid) to authenticated;

--> statement-breakpoint
-- Auth-event audit sink for /api/auth/* routes. SECURITY DEFINER: the
-- auth routes run before (signup/forgot) or outside (login password
-- check) any RLS user context, and audit_log's insert policy requires
-- actor_user_id = auth.uid(), which forgot/reset cannot satisfy. The
-- actor is derived ONLY from the server-verified claims (never from a
-- parameter); action is whitelisted. metadata carries event detail
-- without PII (emails are never stored in audit rows).
create function public.audit_auth_event(
  p_action text,
  p_metadata jsonb default '{}'::jsonb,
  p_ip_hash text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
begin
  if p_action not in ('auth.login', 'auth.signup', 'auth.forgot', 'auth.reset') then
    raise exception 'audit_auth_event: action not permitted';
  end if;
  -- auth.uid() is claims-derived; the EXISTS guards against a stale or
  -- placeholder sub with no backing auth.users row (FK would reject it).
  if auth.uid() is not null
     and exists (select 1 from auth.users u where u.id = auth.uid()) then
    actor := auth.uid();
  end if;
  insert into public.audit_log (id, actor_user_id, action, metadata, ip_hash)
  values (gen_random_uuid(), actor, p_action, coalesce(p_metadata, '{}'::jsonb), p_ip_hash);
end
$$;

revoke execute on function public.audit_auth_event(text, jsonb, text) from public;
grant execute on function public.audit_auth_event(text, jsonb, text) to authenticated;
