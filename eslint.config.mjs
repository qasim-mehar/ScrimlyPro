import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Security perimeter (M1 review A3/C4 + M3 Lane C rule 5):
  // - lib/db/admin.ts uses the service role and BYPASSES RLS entirely.
  // - lib/db/client.ts (getDb) runs as the schema owner — same bypass. Tenant
  //   request paths must use withUserDb (lib/db/user.ts) instead.
  // - lib/admin/admin-db.ts re-exports that service-role client to the admin
  //   panel; lib/admin/** as a whole is admin-panel-only. Imports from the
  //   request path or client code are errors (see the sanctioned-consumer
  //   overrides below — app/admin/** and the two lib/auth guard choke points).
  // - getSession() is a UI hint only; authorization is getUser()-based
  //   (lib/supabase/server.ts#getAuthedUser).
  // Request path = app/** + proxy.ts + all client components (components/**).
  {
    files: ["app/**/*.{ts,tsx}", "proxy.ts", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/db/admin", "**/db/admin.ts", "**/db/admin/*"],
              message:
                "lib/db/admin.ts bypasses RLS with the service-role key and is forbidden in the request path or client code.",
            },
            {
              group: ["**/db/client", "**/db/client.ts"],
              message:
                "getDb() runs as the schema owner and bypasses RLS. Tenant request paths must use withUserDb from lib/db/user.ts (tests and app/dev fixture pages excepted — see overrides below).",
              allowTypeImports: true,
            },
            {
              group: ["**/lib/admin/admin-db", "**/lib/admin/admin-db.ts"],
              message:
                "lib/admin/admin-db.ts wraps the service-role client and is importable ONLY from app/admin/** server files and lib/admin internals (M3 Lane C rule 5).",
            },
            {
              group: ["**/lib/admin", "**/lib/admin/**"],
              message:
                "lib/admin/** is the super-admin panel's server layer (requireAdmin, admin-db, impersonation, kill switch). Nothing outside app/admin/** and the two sanctioned lib/auth guard files may import it.",
            },
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "supabase.auth",
          property: "getSession",
          message:
            "getSession() is a non-authoritative UI hint. Authorization must use getAuthedUser() (getUser) — see lib/supabase/server.ts.",
        },
      ],
    },
  },
  // Sanctioned lib/admin internals: relative imports inside the layer work;
  // only admin-db.ts itself may pull in the raw service-role client, and it
  // must never touch the schema-owner client.
  {
    files: ["lib/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/db/client", "**/db/client.ts"],
              message:
                "getDb() runs as the schema owner and bypasses RLS. lib/admin uses the admin-db service client only.",
              allowTypeImports: true,
            },
            {
              group: ["**/db/admin", "**/db/admin.ts", "**/db/admin/*"],
              message:
                "Only lib/admin/admin-db.ts may import the raw service-role client (single guarded module, M3 Lane C rule 5).",
            },
            {
              group: ["**/lib/admin", "**/lib/admin/**"],
              message:
                "Inside lib/admin use RELATIVE imports ('./x'); the alias pattern is reserved for app/admin consumers.",
            },
          ],
        },
      ],
    },
  },
  {
    // The single sanctioned importer of lib/db/admin in the entire repo.
    files: ["lib/admin/admin-db.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/db/client", "**/db/client.ts"],
              message:
                "getDb() runs as the schema owner and bypasses RLS. lib/admin uses the admin-db service client only.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // app/admin/** + app/api/admin/** server files are the ONLY request-path
  // consumers of lib/admin (including admin-db) — wave1(7): the admin API
  // routes (app/api/admin/**: impersonate, tenants enable/disable) are the
  // same admin-panel trust domain as the pages and are requiredAdmin-gated;
  // C's in-lane exception list predated the routes' final location. The raw
  // db/admin module and the schema-owner client stay forbidden even here.
  {
    files: ["app/admin/**/*.{ts,tsx}", "app/api/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/db/admin", "**/db/admin.ts", "**/db/admin/*"],
              message:
                "lib/db/admin.ts bypasses RLS with the service-role key. app/admin must go through lib/admin/admin-db.",
            },
            {
              group: ["**/db/client", "**/db/client.ts"],
              message:
                "getDb() runs as the schema owner and bypasses RLS. app/admin uses lib/admin/admin-db.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // The two M3 guard choke points (kill-switch + effective identity hooks)
  // are the only lib/auth files allowed to import lib/admin modules. They
  // still may not touch either RLS-bypassing DB client.
  {
    files: ["lib/auth/route-guard.ts", "lib/auth/action-guard.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/db/admin", "**/db/admin.ts", "**/db/admin/*"],
              message:
                "lib/db/admin.ts bypasses RLS with the service-role key and is forbidden in the request path or client code.",
            },
            {
              group: ["**/db/client", "**/db/client.ts"],
              message:
                "getDb() runs as the schema owner and bypasses RLS. Tenant request paths must use withUserDb from lib/db/user.ts.",
              allowTypeImports: true,
            },
            {
              group: ["**/lib/admin/admin-db", "**/lib/admin/admin-db.ts"],
              message:
                "lib/admin/admin-db.ts wraps the service-role client and is importable ONLY from app/admin/** server files and lib/admin internals.",
            },
          ],
        },
      ],
    },
  },
  // Server components under components/admin/** (e.g. the impersonation
  // banner) may import the identity/validation hooks from lib/admin — but
  // never the service-role client.
  {
    files: ["components/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/db/admin", "**/db/admin.ts", "**/db/admin/*"],
              message:
                "lib/db/admin.ts bypasses RLS with the service-role key and is forbidden in the request path or client code.",
            },
            {
              group: ["**/db/client", "**/db/client.ts"],
              message:
                "getDb() runs as the schema owner and bypasses RLS. Tenant request paths must use withUserDb from lib/db/user.ts.",
              allowTypeImports: true,
            },
            {
              group: ["**/lib/admin/admin-db", "**/lib/admin/admin-db.ts"],
              message:
                "lib/admin/admin-db.ts wraps the service-role client and is importable ONLY from app/admin/** server files and lib/admin internals.",
            },
          ],
        },
      ],
    },
  },
  // app/dev fixture pages render seed/dev data that has no owner — under
  // withUserDb/RLS those reads would be empty. They are hard-404'd in
  // production (NODE_ENV gate in every page) and stay dev-only.
  {
    files: ["app/dev/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/db/admin", "**/db/admin.ts", "**/db/admin/*"],
              message:
                "lib/db/admin.ts bypasses RLS and is forbidden everywhere in the request path.",
            },
          ],
        },
      ],
    },
  },
  // The db layer itself (client.ts, user.ts) wires the pooled connection —
  // the admin restriction still applies everywhere.
  {
    files: ["lib/db/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/db/admin", "**/db/admin.ts", "**/db/admin/*"],
              message:
                "lib/db/admin.ts bypasses RLS and is forbidden everywhere in the request path.",
            },
          ],
        },
      ],
    },
  },
  // The one sanctioned getSession() consumer: non-authoritative header hint.
  {
    files: ["components/auth/AccountHeader.tsx"],
    rules: {
      "no-restricted-properties": "off",
    },
  },
  // Wave-1 (WP5): the ONE sanctioned admin-client consumer in the request
  // path. lib/share/public-reader.ts serves the PUBLIC /share/[token] page:
  // an anonymous visitor has no RLS identity, so the projection must read
  // via the service-role key — scoped to a single share-token hash lookup
  // and a deliberate column projection (see its PII tests, its permanent
  // gate). One-file allowlist; the ban stays in force everywhere else.
  {
    files: ["lib/share/public-reader.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/db/client", "**/db/client.ts"],
              message:
                "getDb() runs as the schema owner and bypasses RLS. Tenant request paths must use withUserDb from lib/db/user.ts (tests and app/dev fixture pages excepted — see overrides below).",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // gitignored scratch/measurement dir — never lint throwaway scripts
    ".tmp/**",
  ]),
]);

export default eslintConfig;
