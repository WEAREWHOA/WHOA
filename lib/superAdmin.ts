import { redirect } from "next/navigation";
import { getSessionAmbassadorCode } from "./auth";
import { getByCode } from "./store";
import type { Ambassador } from "./types";

// Shared guard for every Super Admin page/action. Being logged in isn't
// enough — the session's own account must carry is_super_admin, set only
// by another Super Admin (or manually in Supabase for the first one).
export async function requireSuperAdmin(): Promise<Ambassador> {
  const code = await getSessionAmbassadorCode();
  if (!code) redirect("/login");

  const account = await getByCode(code);
  if (!account?.isSuperAdmin) redirect(`/portal/${code}`);

  return account;
}
