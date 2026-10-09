import { getSupabase } from "./supabase";
import { getByCode, updatePermissions } from "./store";
import { sendMusicDecisionEmail } from "./email";

export interface MusicProfileLink {
  label: string;
  url: string;
}

/**
 * Where an application stands.
 *
 * 'pending' is waiting on staff, 'approved' holds the MUSIC tab,
 * 'declined' has been answered. The permission (perm_music) is still
 * what opens the tab -- this records what was decided, so the review
 * queue can empty. See migration 0048_music_admin.sql.
 */
export type MusicianStatus = "pending" | "approved" | "declined";

export interface MusicianProfile {
  ambassadorCode: string;
  artistName: string;
  subgenre: string | null;
  tagline: string | null;
  bio: string | null;
  links: MusicProfileLink[];
  status: MusicianStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MusicianProfileRow {
  ambassador_code: string;
  artist_name: string;
  subgenre: string | null;
  tagline: string | null;
  bio: string | null;
  links: MusicProfileLink[];
  // Optional in the type because they are optional in the database until
  // 0048 has been run. A select of * returns whatever columns exist, so
  // reads keep working through that gap; see reviewMusician for the
  // write side of it.
  status?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_note?: string | null;
  created_at?: string | null;
  updated_at: string;
}

function readStatus(value: unknown): MusicianStatus | null {
  return value === "pending" || value === "approved" || value === "declined" ? value : null;
}

function mapProfile(row: MusicianProfileRow, hasAccess?: boolean): MusicianProfile {
  return {
    ambassadorCode: row.ambassador_code,
    artistName: row.artist_name,
    subgenre: row.subgenre,
    tagline: row.tagline,
    bio: row.bio,
    links: Array.isArray(row.links) ? row.links : [],
    // Before 0048 runs there is no status column, so it is derived the
    // way the app used to derive it: holding the permission means
    // approved, anything else is still waiting.
    status: readStatus(row.status) ?? (hasAccess ? "approved" : "pending"),
    reviewedAt: row.reviewed_at ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewNote: row.review_note ?? null,
    createdAt: row.created_at ?? row.updated_at,
    updatedAt: row.updated_at,
  };
}

// Powers both the "Join our Music Collective" application (creates this row
// while perm_music is still false, i.e. pending) and the Music tab's
// self-editing form once approved — same row, so nothing typed at
// application time is lost once staff approves.
export async function getMusicianProfile(code: string): Promise<MusicianProfile | undefined> {
  const { data, error } = await getSupabase()
    .from("musician_profiles")
    .select("*")
    .eq("ambassador_code", code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to load musician profile: ${error.message}`);

  return data ? mapProfile(data as MusicianProfileRow) : undefined;
}

/**
 * One application, with the account behind it.
 *
 * The queue needs the contact name and email next to the artist name --
 * staff is deciding about a person, and the artist name is often a
 * handle that says nothing about who wrote in.
 */
export interface MusicianApplication extends MusicianProfile {
  accountName: string;
  accountEmail: string;
  /** Whether perm_music is actually set, which is what opens their tab. */
  hasAccess: boolean;
}

interface JoinedRow extends MusicianProfileRow {
  ambassadors: { name: string; email: string; perm_music: boolean } | null;
}

/**
 * Every Music Collective application, newest first.
 *
 * Grouping happens in the caller rather than in three queries, because
 * the whole roster is a few hundred rows at most and the tab shows all
 * three groups on one screen anyway.
 */
export async function listMusicianApplications(): Promise<MusicianApplication[]> {
  const { data, error } = await getSupabase()
    .from("musician_profiles")
    .select("*, ambassadors(name, email, perm_music)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load Music Collective applications: ${error.message}`);

  return ((data ?? []) as JoinedRow[]).map((row) => {
    const hasAccess = row.ambassadors?.perm_music === true;
    return {
      ...mapProfile(row, hasAccess),
      accountName: row.ambassadors?.name ?? "Unknown",
      accountEmail: row.ambassadors?.email ?? "",
      hasAccess,
    };
  });
}

/** Does this error mean 0048 has not been run on this database yet? */
function isMissingColumn(error: { message?: string; code?: string }): boolean {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

/**
 * Approve or decline a Music Collective application.
 *
 * Two writes, in this order on purpose. The permission is what actually
 * opens the artist's tab, so it goes first: if the status write fails,
 * the artist still gets what they were promised and the queue is merely
 * stale. The other order would show an empty queue over an artist who
 * never got in.
 *
 * Shared with the one-click links in the staff notification email
 * (app/api/approve/[token]/route.ts) so that a decision made there and a
 * decision made in the tab leave the same record behind. Before
 * migration 0048 has been run the status write is skipped rather than
 * raised -- granting access is the part that matters, and an unrun
 * migration should not turn an approval into an error page.
 */
export async function reviewMusician(
  code: string,
  decision: "approved" | "declined",
  options: { reviewedBy?: string | null; note?: string | null } = {},
): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const account = await getByCode(normalized);
  const profile = await getMusicianProfile(normalized);

  await updatePermissions(normalized, { permissions: { music: decision === "approved" } });

  const { error } = await getSupabase()
    .from("musician_profiles")
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: options.reviewedBy ?? null,
      review_note: options.note || null,
      updated_at: new Date().toISOString(),
    })
    .eq("ambassador_code", normalized);

  if (error) {
    if (!isMissingColumn(error)) {
      throw new Error(`Failed to record music review: ${error.message}`);
    }
    console.error(
      "Music review recorded as a permission only (migration 0048 not run):",
      error.message,
    );
  }

  // Last, and best-effort. The decision is already recorded, so a Resend
  // outage must not turn a handled application into a failed one that
  // comes back to the queue and gets decided twice.
  // Re-deciding something that was already decided that way -- two staff
  // clicking Approve on the same row, or a decision clicked in the email
  // and then again in the tab -- must not email the artist twice.
  const wasAlready =
    account !== undefined &&
    account.permissions.music === (decision === "approved") &&
    profile?.status === decision;

  if (account && !wasAlready) {
    try {
      await sendMusicDecisionEmail({
        name: account.name,
        email: account.email,
        artistName: profile?.artistName ?? account.name,
        approved: decision === "approved",
      });
    } catch (err) {
      console.error("sendMusicDecisionEmail failed:", err);
    }
  }
}

/**
 * Puts a declined applicant back in the queue when they apply again.
 *
 * Scoped to 'declined' rows on purpose. An approved artist re-saving
 * their profile must not un-approve themselves, and a pending one is
 * already where they belong, so this is the only transition a new
 * submission is allowed to make on its own.
 */
export async function reopenMusicianApplication(code: string): Promise<void> {
  const { error } = await getSupabase()
    .from("musician_profiles")
    .update({ status: "pending", reviewed_at: null, reviewed_by: null })
    .eq("ambassador_code", code.trim().toUpperCase())
    .eq("status", "declined");

  // Best-effort, and silent before 0048 has been run: a reapplication
  // that fails to clear a stale decision is worth strictly less than the
  // application itself, which has already been saved by now.
  if (error && !isMissingColumn(error)) {
    console.error("Failed to reopen music application:", error.message);
  }
}

export async function saveMusicianProfile(
  code: string,
  input: {
    artistName: string;
    subgenre?: string;
    tagline?: string;
    bio?: string;
    links: MusicProfileLink[];
  },
): Promise<void> {
  const { error } = await getSupabase()
    .from("musician_profiles")
    .upsert({
      ambassador_code: code.trim().toUpperCase(),
      artist_name: input.artistName,
      subgenre: input.subgenre || null,
      tagline: input.tagline || null,
      bio: input.bio || null,
      links: input.links,
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(`Failed to save musician profile: ${error.message}`);
}
