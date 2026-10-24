-- M2 (Lane B): invite preview for the /invite/[token] page. GET must never
-- mutate (link scanners prefetch), so the page validates via this SECURITY
-- DEFINER read: zero rows for unknown / expired / already-used tokens,
-- indistinguishably (no existence leakage). Acceptance itself goes through
-- public.accept_org_invite (0010) in a POST server action.
create or replace function public.org_invite_preview(p_token_hash text)
returns table (org_name text, role text)
language plpgsql stable security definer set search_path = public as $func$
begin
  return query
    select o.name, i.role
    from public.org_invites i
    join public.organizations o on o.id = i.org_id
    where i.token_hash = p_token_hash
      and i.accepted_at is null
      and i.expires_at > now();
end
$func$;
