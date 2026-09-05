import { randomBytes } from "crypto";
import { getSupabase } from "./supabase";
import { SITE_URL } from "./siteUrl";

export type ApprovalKind =
  | "ambassador_application"
  | "event_sales_application"
  | "event_sales_signup"
  | "music_application"
  | "art_application"
  | "art_product";

export interface ApprovalToken {
  token: string;
  kind: ApprovalKind;
  subjectCode: string | null;
  subjectId: string | null;
  decision: "approved" | "declined" | null;
  usedAt: string | null;
  expiresAt: string;
}

interface ApprovalTokenRow {
  token: string;
  kind: ApprovalKind;
  subject_code: string | null;
  subject_id: string | null;
  decision: "approved" | "declined" | null;
  used_at: string | null;
  expires_at: string;
}

function mapToken(row: ApprovalTokenRow): ApprovalToken {
  return {
    token: row.token,
    kind: row.kind,
    subjectCode: row.subject_code,
    subjectId: row.subject_id,
    decision: row.decision,
    usedAt: row.used_at,
    expiresAt: row.expires_at,
  };
}

const TOKEN_TTL_DAYS = 30;

async function createApprovalToken(kind: ApprovalKind, subject: { code?: string; id?: string }): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await getSupabase()
    .from("approval_tokens")
    .insert({ token, kind, subject_code: subject.code ?? null, subject_id: subject.id ?? null, expires_at: expiresAt });

  if (error) throw new Error(`Failed to create approval token: ${error.message}`);
  return token;
}

export interface ApprovalLinks {
  approveUrl: string;
  declineUrl: string;
}

// The single entry point every notification email uses to get its two
// button links — creates one token and returns both URLs built from it.
export async function createApprovalLinks(
  kind: ApprovalKind,
  subject: { code?: string; id?: string },
): Promise<ApprovalLinks> {
  const token = await createApprovalToken(kind, subject);
  return {
    approveUrl: `${SITE_URL}/api/approve/${token}?decision=approve`,
    declineUrl: `${SITE_URL}/api/approve/${token}?decision=decline`,
  };
}

export async function getApprovalToken(token: string): Promise<ApprovalToken | undefined> {
  const { data, error } = await getSupabase().from("approval_tokens").select("*").eq("token", token).maybeSingle();
  if (error) throw new Error(`Failed to look up approval token: ${error.message}`);
  return data ? mapToken(data as ApprovalTokenRow) : undefined;
}

export async function consumeApprovalToken(token: string, decision: "approved" | "declined"): Promise<void> {
  const { error } = await getSupabase()
    .from("approval_tokens")
    .update({ decision, used_at: new Date().toISOString() })
    .eq("token", token);
  if (error) throw new Error(`Failed to record approval decision: ${error.message}`);
}
