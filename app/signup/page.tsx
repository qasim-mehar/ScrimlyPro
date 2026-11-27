import { Suspense } from "react";

import { RegistrationAuth } from "@/components/auth/registration-auth";

export const metadata = { title: "Sign up — ScrimlyPro" };

export default function SignupPage() {
  return (
    <Suspense>
      <RegistrationAuth mode="signup" />
    </Suspense>
  );
}
