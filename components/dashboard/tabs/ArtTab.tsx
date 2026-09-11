import Link from "next/link";
import { formatCents } from "@/lib/money";
import { saveArtProfileAction } from "@/lib/actions";
import ProductPipeline from "@/components/dashboard/ProductPipeline";
import type {
  ArtInventoryItem,
  ArtProduct,
  ArtProfile,
  ArtStats,
} from "@/lib/artCollective";

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Artist name is required.",
  server: "Something went wrong saving your profile — try again.",
};

const LINK_LABELS = ["Instagram", "Etsy", "Website", "TikTok"] as const;

export default function ArtTab({
  code,
  hasArtAccess,
  profile,
  stats,
  inventory,
  products,
  saved,
  error,
  productSubmitted,
  productError,
  photoError,
}: {
  code: string;
  hasArtAccess: boolean;
  profile?: ArtProfile;
  stats: ArtStats;
  inventory: ArtInventoryItem[];
  products: ArtProduct[];
  saved?: boolean;
  error?: string;
  productSubmitted?: boolean;
  productError?: string;
  /** A photo didn't make it to storage, even though the rest saved. */
  photoError?: boolean;
}) {
  if (!hasArtAccess) {
    if (profile) {
      return (
        <div className="border-flame-2/40 bg-flame-2/10 rounded-xl border px-5 py-4 text-sm text-muted">
          Your Art Collective application for{" "}
          <span className="text-foreground font-semibold">
            {profile.artistName}
          </span>{" "}
          is in — we&apos;ll follow up by email once it&apos;s reviewed. This
          tab unlocks the moment it&apos;s approved.
        </div>
      );
    }

    return (
      <div className="border-flame-2/40 bg-flame-2/10 rounded-xl border px-5 py-4 text-sm text-muted">
        Join the WHOA Art Collective to get an ART tab here — profile, links,
        and a real product pipeline into the shop.{" "}
        <Link
          href="/art-collective/apply"
          className="text-flame font-medium hover:underline"
        >
          Apply to join
        </Link>
        .
      </div>
    );
  }

  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.server)
    : null;
  const linkByLabel = new Map(
    (profile?.links ?? []).map((link) => [link.label, link.url]),
  );

  // Shown alongside the success notice, not instead of it: the text saved,
  // the image didn't, and saying only "saved" would be a lie.
  const photoWarning = photoError ? (
    <div className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-4 rounded-xl border px-5 py-4 text-sm">
      Your details saved, but the image couldn&apos;t be uploaded. Try again
      with a smaller JPG or PNG — if it keeps failing, tell us at
      info@wearewhoa.com and we&apos;ll sort it out.
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Total sales</p>
          <p className="font-display mt-1 text-3xl">
            {formatCents(stats.totalSalesCents)}
          </p>
        </div>
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Units sold</p>
          <p className="font-display mt-1 text-3xl">{stats.itemsSold}</p>
        </div>
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Orders</p>
          <p className="font-display mt-1 text-3xl">{stats.orderCount}</p>
        </div>
      </div>

      <div>
        <h3 className="font-display text-xl">Your inventory</h3>
        <p className="mt-1 text-sm text-muted">
          Live, synced straight from Square — online store, retail, and events
          sales all count.
        </p>
        {inventory.length === 0 ? (
          <p className="mt-4 rounded-xl border border-border px-5 py-4 text-sm text-muted">
            Nothing live yet — an approved product shows up here once it syncs
            from Square (usually within a few minutes).
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {inventory.map((item) => (
              <div
                key={item.id}
                className="card-surface flex gap-4 rounded-2xl border border-border p-4"
              >
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted">
                    {formatCents(item.minPriceCents)} · {item.totalStock} in
                    stock
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-surface rounded-xl p-6">
        <h3 className="font-semibold">Your Art Collective profile</h3>
        <p className="mt-1 text-sm text-muted">
          This is what shows on your artist page — keep it up to date any time.
        </p>

        {saved && (
          <p className="mt-4 rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-2 text-sm text-flame-3">
            Profile saved.
          </p>
        )}
        {saved && photoWarning}
        {errorMessage && (
          <p className="mt-4 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
            {errorMessage}
          </p>
        )}

        <form
          action={saveArtProfileAction}
          className="mt-4 flex flex-col gap-4"
        >
          <input type="hidden" name="code" value={code} />

          {profile?.profileImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profileImageUrl}
              alt=""
              className="h-20 w-20 rounded-full border border-border-strong object-cover"
            />
          )}

          <div>
            <label htmlFor="profileImage" className="text-sm font-medium">
              Profile photo{" "}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="profileImage"
              name="profileImage"
              type="file"
              accept="image/*"
              className="mt-2 w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-raised file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
            />
          </div>

          <div>
            <label htmlFor="artistName" className="text-sm font-medium">
              Artist name
            </label>
            <input
              id="artistName"
              name="artistName"
              type="text"
              required
              defaultValue={profile?.artistName ?? ""}
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="medium" className="text-sm font-medium">
              Medium <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="medium"
              name="medium"
              type="text"
              defaultValue={profile?.medium ?? ""}
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="tagline" className="text-sm font-medium">
              Tagline <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="tagline"
              name="tagline"
              type="text"
              defaultValue={profile?.tagline ?? ""}
              className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <label htmlFor="bio" className="text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              defaultValue={profile?.bio ?? ""}
              className="mt-2 w-full resize-none rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div>
            <span className="text-sm font-medium">Links</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {LINK_LABELS.map((label) => (
                <div key={label}>
                  <label
                    htmlFor={`link${label}`}
                    className="text-xs text-muted"
                  >
                    {label}
                  </label>
                  <input
                    id={`link${label}`}
                    name={`link${label}`}
                    type="url"
                    placeholder="https://"
                    defaultValue={linkByLabel.get(label) ?? ""}
                    className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="self-start rounded-full border border-border-strong px-6 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
          >
            Save profile
          </button>
        </form>
      </div>

      <ProductPipeline
        code={code}
        products={products}
        blurb="Submit up to 5 at once. Each one goes to WHOA for review before it shows in the shop."
        submitted={productSubmitted}
        error={productError}
        photoError={photoError}
      />
    </div>
  );
}
