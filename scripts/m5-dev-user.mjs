// M5 dev helper (LOCAL DEV ONLY, never runs in CI): upsert the dashboard
// dev user in the HOSTED GoTrue auth schema (direct postgres connection —
// the hosted project has email confirmation ON, so API signup can't be
// completed without an inbox). Mirrors what GoTrue's admin invite would do:
// auth.users row + the matching auth.identities row + empty token columns
// (GoTrue errors on NULL confirmation_token with 500 unexpected_failure).
// Idempotent: re-running updates the password and prints the id.
import postgres from "postgres";

const HOSTED_URL =
  "postgresql://postgres.bhkjxxkypdwmlwgqiihv:%40Supabase20@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";
const EMAIL = "m5dash-dev@gmail.com";
const PASSWORD = "M5dash-dev-2026!";

const sql = postgres(HOSTED_URL, { max: 1, prepare: false });
try {
  const existing = await sql`
    select id from auth.users where email = ${EMAIL} limit 1`;
  let id;
  if (existing[0]) {
    id = existing[0].id;
    await sql`
      update auth.users
      set encrypted_password = crypt(${PASSWORD}, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          updated_at = now()
      where id = ${id}`;
    console.log("updated existing user", id);
  } else {
    id = crypto.randomUUID();
    await sql`
      insert into auth.users
        (instance_id, id, aud, role, email, encrypted_password,
         email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
         created_at, updated_at)
      values (
        '00000000-0000-0000-0000-000000000000', ${id}::uuid,
        'authenticated', 'authenticated', ${EMAIL},
        crypt(${PASSWORD}, gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        now(), now())`;
    console.log("created user", id);
  }

  // GoTrue's sign-in query joins auth.identities; a users row without the
  // matching identity fails the password grant.
  const ident = await sql`
    select id from auth.identities where user_id = ${id}::uuid limit 1`;
  if (!ident[0]) {
    await sql`
      insert into auth.identities
        (provider_id, user_id, identity_data, provider,
         last_sign_in_at, created_at, updated_at)
      values (
        ${id}, ${id}::uuid,
        ${sql.json({ sub: id, email, email_verified: true, phone_verified: false })}::jsonb,
        'email', now(), now(), now())`;
  } else {
    await sql`
      update auth.identities
      set identity_data = ${sql.json({ sub: id, email, email_verified: true, phone_verified: false })}::jsonb
      where user_id = ${id}::uuid`;
  }

  // NULL tokens break GoTrue's post-login queries — force the empty-string
  // convention its own signup path writes.
  await sql`
    update auth.users set
      confirmation_token = '', recovery_token = '', email_change_token_new = '',
      email_change = '', email_change_token_current = '', reauthentication_token = '',
      phone_change_token = '', phone = ''
    where id = ${id}::uuid`;

  const prof = await sql`
    select id, email, role from public.profiles where id = ${id}::uuid`;
  console.log("profile:", JSON.stringify(prof[0] ?? null));
} finally {
  await sql.end();
}
