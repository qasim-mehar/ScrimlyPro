import { noStore } from "@/lib/http";

/** True when GoTrue rejected signup because the email already exists. */
export function isAlreadyRegistered(error: { message?: string }): boolean {
  const m = (error.message ?? "").toLowerCase();
  return m.includes("already been registered") || m.includes("already registered");
}

export function forbidden() {
  return noStore({ error: "forbidden" }, { status: 403 });
}

export function rateLimited(retryAfterSeconds: number) {
  return noStore({ error: "rate_limited" }, {
    status: 429,
    headers: { "Retry-After": String(retryAfterSeconds) },
  });
}

export function validationError(fields: Record<string, string>) {
  return noStore({ error: "validation_error", fields }, { status: 400 });
}

export function badRequest() {
  return noStore({ error: "bad_request" }, { status: 400 });
}

export function authUnavailable() {
  return noStore({ error: "auth_unavailable" }, { status: 503 });
}
