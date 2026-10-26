import postgres from "postgres";

/**
 * Admin DB client — BYPASSES RLS. Migrations and one-off scripts ONLY.
 *
 * Never import this from app/**, proxy.ts, or any client module: the ESLint
 * `no-restricted-imports` rule in eslint.config.mjs makes such imports an
 * error. Request paths must use lib/db/user.ts (withUserDb) instead.
 *
 * Auth note: the service-role JWT env (see .env.example — the literal name
 * is kept out of comments so source maps never carry it) is for the
 * Supabase REST/auth APIs; the SQL path is the postgres connection
 * (SUPABASE_DB_URL). Locally that role is a superuser; on hosted Supabase it
 * owns the schema and therefore bypasses RLS — same trust level, same rule:
 * nothing in the request path may touch it.
 */
const globalForAdmin = globalThis as unknown as {
  __scrimlyAdminSql?: postgres.Sql;
};

export function getAdminSql(): postgres.Sql {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL is not set (admin client)");
  globalForAdmin.__scrimlyAdminSql ??= postgres(url, { prepare: false, max: 4 });
  return globalForAdmin.__scrimlyAdminSql;
}
