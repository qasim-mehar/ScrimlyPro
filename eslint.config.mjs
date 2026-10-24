import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Security perimeter (M1 review A3/C4):
  // - lib/db/admin.ts uses the service role and BYPASSES RLS entirely.
  // - lib/db/client.ts (getDb) runs as the schema owner — same bypass. Tenant
  //   request paths must use withUserDb (lib/db/user.ts) instead.
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
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
