import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getSupabase } from "./supabase";

const SESSION_COOKIE = "whoa_session";
const SESSION_DAYS = 30;

// Non-httpOnly companion to SESSION_COOKIE, carrying no meaningful value of
// its own (never checked server-side — the real session cookie above is
// what auth actually rests on). It exists purely so client components
// (e.g. the nav) can tell "logged in" from "logged out" via document.cookie
// without a server round-trip or reading cookies() in the root layout,
// which would force the entire site into dynamic rendering.
const LOGGED_IN_COOKIE = "whoa_logged_in";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(ambassadorCode: string): Promise<void> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await getSupabase().from("sessions").insert({
    token,
    ambassador_code: ambassadorCode,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
  store.set(LOGGED_IN_COOKIE, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSessionAmbassadorCode(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { data } = await getSupabase()
    .from("sessions")
    .select("ambassador_code, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  return data.ambassador_code;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await getSupabase().from("sessions").delete().eq("token", token);
  }

  store.delete(SESSION_COOKIE);
  store.delete(LOGGED_IN_COOKIE);
}
