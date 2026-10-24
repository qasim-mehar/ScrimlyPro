-- M2: enforce the org-tenancy invariant — every session belongs to an org.
-- Ordering: 0010 created org_id (nullable) + org tables + policies, 0011
-- backfilled one Personal org per existing user and set org_id on every
-- session. Fresh databases arrive here with zero sessions.
alter table public.sessions alter column org_id set not null;
