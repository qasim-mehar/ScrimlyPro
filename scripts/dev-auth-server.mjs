// LOCAL DEV ONLY — a tiny GoTrue stand-in for machines without the hosted
// Supabase project (and without Docker to run `supabase start`).
//
// It implements only the endpoints @supabase/ssr + auth-js touch for the
// email/password flows this app uses (/signup, /token, /user, /logout,
// /recover). Passwords are scrypt-hashed into `public.dev_auth_users` in the
// local Postgres; identities mirror into the `auth.users` shim created by
// migration 0002 so the profile trigger + RLS keep working.
//
// NEVER point this at a hosted/cut-over database: it refuses to start when
// auth.users has an `encrypted_password` column (i.e. a real GoTrue schema).
//
// Run: node --env-file=.env.local scripts/dev-auth-server.mjs
import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import postgres from "postgres";

const PORT = Number(process.env.DEV_AUTH_PORT ?? 54321);
const SECRET = process.env.DEV_AUTH_SECRET ?? "scrimlypro-local-dev-auth-stub";
const ACCESS_TTL = 3600;
const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL is required (run with --env-file=.env.local)");
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 4, prepare: false, onnotice: () => {} });

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(value) {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

function mintAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aud: "authenticated",
      iat: now,
      exp: now + ACCESS_TTL,
      session_id: randomUUID(),
    }),
  );
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

function readAccessToken(token) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;
  if (sign(`${header}.${payload}`) !== signature) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof claims.exp === "number" && claims.exp < Date.now() / 1000) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

function hashPassword(password) {
  const salt = randomUUID();
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function verifyPassword(password, stored) {
  const [salt, digest] = String(stored).split(":");
  if (!salt || !digest) return false;
  const candidate = scryptSync(password, salt, 32);
  const expected = Buffer.from(digest, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}

function publicUser(row) {
  return {
    id: row.id,
    aud: "authenticated",
    role: "authenticated",
    email: row.email,
    email_confirmed_at: row.created_at,
    phone: "",
    confirmed_at: row.created_at,
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

function sessionFor(row) {
  const access_token = mintAccessToken(row);
  return {
    access_token,
    token_type: "bearer",
    expires_in: ACCESS_TTL,
    expires_at: Math.floor(Date.now() / 1000) + ACCESS_TTL,
    refresh_token: `${row.id}.${Date.now()}.${randomUUID()}`,
    user: publicUser(row),
  };
}

function send(res, status, body, extraHeaders = {}) {
  if (status === 204) {
    res.writeHead(status, corsHeaders(extraHeaders));
    res.end();
    return;
  }
  const json = JSON.stringify(body ?? {});
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(json),
    "cache-control": "no-store",
    ...corsHeaders(extraHeaders),
  });
  res.end(json);
}

function corsHeaders(extra = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    ...extra,
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

async function findUserByEmail(email) {
  const rows = await sql`
    select id, email, password_hash, created_at from public.dev_auth_users
    where lower(email) = lower(${email}) limit 1`;
  return rows[0] ?? null;
}

async function findUserById(id) {
  const rows = await sql`
    select id, email, password_hash, created_at from public.dev_auth_users
    where id = ${id} limit 1`;
  return rows[0] ?? null;
}

async function createUser(email, password) {
  const id = randomUUID();
  await sql.begin(async (tx) => {
    await tx`
      insert into public.dev_auth_users (id, email, password_hash)
      values (${id}, ${email}, ${hashPassword(password)})`;
    // The 0002 shim table: profile trigger + user_id FKs bind to this row.
    await tx`insert into auth.users (id, email) values (${id}, ${email})`;
  });
  return findUserById(id);
}

function bearer(req) {
  const header = req.headers.authorization ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7) : null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "");

  if (req.method === "OPTIONS") return send(res, 204);

  try {
    if (req.method === "GET" && path === "/auth/v1/health") {
      return send(res, 200, { version: "scrimlypro-dev-auth-stub" });
    }

    if (req.method === "POST" && path === "/auth/v1/signup") {
      const body = await readBody(req);
      if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
        return send(res, 400, { code: "validation_failed", msg: "Email and password are required" });
      }
      if (await findUserByEmail(body.email)) {
        return send(res, 422, {
          code: "user_already_exists",
          msg: "User already registered",
        });
      }
      const user = await createUser(body.email, body.password);
      return send(res, 200, { user: publicUser(user), session: sessionFor(user) });
    }

    if (req.method === "POST" && path === "/auth/v1/token") {
      const body = await readBody(req);
      const grant = url.searchParams.get("grant_type");
      if (grant === "password") {
        const user = body && typeof body.email === "string"
          ? await findUserByEmail(body.email)
          : null;
        if (!user || typeof body.password !== "string" || !verifyPassword(body.password, user.password_hash)) {
          return send(res, 400, {
            error: "invalid_grant",
            error_description: "Invalid login credentials",
            msg: "Invalid login credentials",
          });
        }
        return send(res, 200, sessionFor(user));
      }
      if (grant === "refresh_token") {
        const refresh = body && typeof body.refresh_token === "string" ? body.refresh_token : "";
        const userId = refresh.split(".")[0];
        const user = userId ? await findUserById(userId) : null;
        if (!user) {
          return send(res, 400, {
            error: "invalid_grant",
            error_description: "Invalid Refresh Token: Refresh Token Not Found",
          });
        }
        return send(res, 200, sessionFor(user));
      }
      return send(res, 400, { error: "unsupported_grant_type" });
    }

    if (req.method === "GET" && path === "/auth/v1/user") {
      const token = bearer(req);
      const claims = token ? readAccessToken(token) : null;
      const user = claims?.sub ? await findUserById(claims.sub) : null;
      if (!user) {
        return send(res, 401, { code: 401, msg: "invalid claim: missing sub claim" });
      }
      return send(res, 200, publicUser(user));
    }

    if (req.method === "PUT" && path === "/auth/v1/user") {
      const token = bearer(req);
      const claims = token ? readAccessToken(token) : null;
      const user = claims?.sub ? await findUserById(claims.sub) : null;
      if (!user) return send(res, 401, { code: 401, msg: "invalid claim: missing sub claim" });
      const body = await readBody(req);
      if (body && typeof body.password === "string" && body.password.length > 0) {
        await sql`
          update public.dev_auth_users set password_hash = ${hashPassword(body.password)}
          where id = ${user.id}`;
      }
      return send(res, 200, publicUser(user));
    }

    if (req.method === "POST" && path === "/auth/v1/logout") {
      return send(res, 204);
    }

    if (req.method === "POST" && path === "/auth/v1/recover") {
      return send(res, 200, {});
    }

    return send(res, 404, { msg: "Not found" });
  } catch (error) {
    console.error("dev-auth error:", error);
    return send(res, 500, { code: "unexpected_failure", msg: "Unexpected failure" });
  }
});

async function main() {
  const [schema] = await sql`
    select count(*)::int as hosted
    from information_schema.columns
    where table_schema = 'auth' and table_name = 'users'
      and column_name = 'encrypted_password'`;
  if (schema?.hosted > 0) {
    console.error(
      "REFUSING: auth.users looks like a real GoTrue schema. This stub is local-dev only.",
    );
    process.exit(1);
  }

  await sql`
    create table if not exists public.dev_auth_users (
      id uuid primary key,
      email text not null unique,
      password_hash text not null,
      created_at timestamptz not null default now()
    )`;

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`dev auth stub listening on http://127.0.0.1:${PORT}/auth/v1`);
  });
}

main().catch((error) => {
  console.error("dev auth stub failed to start:", error.message);
  process.exit(1);
});
