-- Enforce the tenant-root invariant: every session has an owner.
-- Safe ordering: fresh DBs get here with no rows; the legacy-data flow runs
-- scripts/migrate-local-to-supabase.mjs --apply (backfills user_id) BEFORE the
-- next db:migrate applies this file. RLS already rejected NULL-owner inserts;
-- this makes the schema invariant explicit for M2.
alter table public.sessions alter column user_id set not null;
