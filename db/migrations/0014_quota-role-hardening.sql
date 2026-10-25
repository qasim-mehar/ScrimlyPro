-- M2 review hardening (B-1/B-2/B-3): close the quota self-service raise,
-- bound invite roles at the DB layer, and move the owner-grant/owner-row
-- invariants on org_members from app-only guards into RLS.
--
-- B-1a: org_quotas becomes SELECT-only for members. The old owner INSERT/UPDATE
-- policies let a tenant raise monthly_ocr_calls/max_sessions at will ("contact
-- support" was decorative). The only writer is now the bootstrap trigger below
-- (SECURITY DEFINER, platform-pinned defaults, fires on organizations INSERT),
-- so no tenant principal can create or modify a quota row — raising a limit is
-- a platform-side SQL operation (super admin UI is M3+). No DELETE policy:
-- default deny, rows live/die with the org cascade.
drop policy if exists org_quota_insert on public.org_quotas;
drop policy if exists org_quota_update on public.org_quotas;
--> statement-breakpoint
create or replace function public.org_quotas_bootstrap()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.org_quotas (org_id) values (new.id)
  on conflict (org_id) do nothing;
  return new;
end
$func$;
--> statement-breakpoint
create trigger trg_org_quotas_bootstrap
  after insert on public.organizations
  for each row execute function public.org_quotas_bootstrap();
--> statement-breakpoint
-- B-1b: the OCR meter is per-USER, not per-org. Per-org COUNTs are evaded by
-- creating a fresh org (meter restarts at zero) — unlimited org creation made
-- the paid-API cap unenforceable. usage_events pins user_id = auth.uid() at
-- insert and is append-only under RLS, so a user-total COUNT is tamper-proof.
-- The select policy widens to "own rows, ever" so the meter still sees usage
-- from orgs the user has since left (undercounting would under-charge).
drop policy if exists usage_select_events on public.usage_events;
create policy usage_select_events on public.usage_events
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.org_role(auth.uid(), org_id) is not null
  );
--> statement-breakpoint
create index if not exists usage_events_user_month_idx
  on public.usage_events (user_id, created_at);
--> statement-breakpoint
-- B-2: invite roles are bounded at the DB layer — 'owner' is never invitable
-- (ownership transfer is explicitly out of pilot scope, see report §7). The
-- CHECKs make a forged owner invite impossible even through the RLS-permitted
-- insert path, and accept_org_invite clamps what it copies onto org_members.
alter table public.org_invites
  add constraint org_invites_role_check check (role in ('member', 'admin'));
alter table public.org_members
  add constraint org_members_role_check check (role in ('owner', 'admin', 'member'));
--> statement-breakpoint
-- Clamp on copy: legacy/foreign rows (the constraint above already blocks new
-- ones) can never mint an owner membership through acceptance.
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
  values (
    v_org,
    auth.uid(),
    case when v_role in ('admin', 'member') then v_role else 'member' end
  )
  on conflict (org_id, user_id) do nothing;
  return v_org;
end
$func$;
--> statement-breakpoint
-- B-3: owner-granting and owner-row mutation are owner-only at the DB layer.
-- Before this change an admin could UPDATE the owner's row (demote), DELETE
-- it, or set their own role to 'owner' — the last-owner/anti-escalation rules
-- lived only in lib/orgs/roles.ts (one forgotten server-action guard away
-- from admin self-escalation). The app guard stays as UX; this is the law.
-- USING sees the OLD row, WITH CHECK sees the NEW row: an admin may manage
-- non-owner rows either direction, but no principal below owner can target an
-- owner row or write role='owner'.
drop policy if exists org_member_update on public.org_members;
create policy org_member_update on public.org_members
  for update to authenticated
  using (
    case public.org_role(auth.uid(), org_id)
      when 'owner' then true
      when 'admin' then role <> 'owner'
      else false
    end
  )
  with check (
    case public.org_role(auth.uid(), org_id)
      when 'owner' then true
      when 'admin' then role <> 'owner'
      else false
    end
  );
drop policy if exists org_member_delete on public.org_members;
create policy org_member_delete on public.org_members
  for delete to authenticated
  using (
    case public.org_role(auth.uid(), org_id)
      when 'owner' then true
      when 'admin' then role <> 'owner'
      else false
    end
  );
