/**
 * Advisory password feedback for the signup form.
 *
 * Deliberately NOT a gate: the signup endpoint (`lib/auth/validate.ts`) only
 * requires 8–128 characters. These checks are guidance that helps an organizer
 * choose a stronger password; a weak-but-valid password still submits.
 */
export type PasswordCheck = {
  id: "length" | "case" | "number" | "symbol";
  label: string;
  met: boolean;
};

export type PasswordStrength = {
  /** Number of satisfied advisory checks, 0–4. */
  score: number;
  label: "Weak" | "Fair" | "Good" | "Strong";
  checks: PasswordCheck[];
};

export function passwordStrength(value: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    { id: "length", label: "8 characters or more", met: value.length >= 8 },
    {
      id: "case",
      label: "Upper and lowercase letters",
      met: /[a-z]/.test(value) && /[A-Z]/.test(value),
    },
    { id: "number", label: "A number", met: /\d/.test(value) },
    { id: "symbol", label: "A symbol", met: /[^A-Za-z0-9]/.test(value) },
  ];
  const score = checks.filter((check) => check.met).length;
  const label =
    score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";
  return { score, label, checks };
}
