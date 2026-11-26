import { Suspense } from "react";

import { AuthConsole } from "@/components/auth/auth-console";

export const metadata = { title: "Sign up — ScrimlyPro" };

export default function SignupPage() {
  return (
    <Suspense>
      <AuthConsole mode="signup" />
    </Suspense>
  );
}
