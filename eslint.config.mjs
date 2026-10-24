import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Security: lib/db/admin.ts uses the service role and bypasses RLS. It must
  // never be imported from the request path (app/), the proxy, or any client
  // module (all client components live under components/). Scripts under
  // scripts/ and lib/db/admin.ts itself are exempt.
  {
    files: ["app/**/*.{ts,tsx}", "proxy.ts", "components/**/*.{ts,tsx}"],
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
  ]),
]);

export default eslintConfig;
