import { formatCents } from "@/lib/money";
import ArtProductRequest from "@/components/dashboard/tabs/ArtProductRequest";
import ArtProductSubmitForm from "@/components/artCollective/ArtProductSubmitForm";
import { ART_SIZES, totalSizeStock } from "@/lib/artCollective";
import type { ArtProduct } from "@/lib/artCollective";

const PRODUCT_ERROR_MESSAGES: Record<string, string> = {
  "missing-choice":
    "Choose whether you'd also like to submit for retail store / events.",
  "invalid-price": "Enter a valid price for each product you're submitting.",
  empty: "Add at least one product before submitting.",
  server: "Something went wrong submitting your products — try again.",
};

const STATUS_LABEL: Record<ArtProduct["status"], string> = {
  pending: "Pending review",
  approved: "Live in the shop",
  declined: "Not approved",
  removed: "Taken down",
};

/**
 * Submitting products into the shop, and seeing what happened to what you
 * already submitted.
 *
 * Lifted out of ArtTab so vendors and musicians get the same pipeline
 * rather than a second one built alongside it. There is only ever one
 * route into the shop — the same table, the same review queue, the same
 * Square item on approval — and which tab you reached it from doesn't
 * change any of that. All that varies is the wording, since "your art"
 * reads oddly to someone submitting a record or a rack of hats.
 */
export default function ProductPipeline({
  code,
  products,
  blurb,
  submitted,
  error,
  photoError,
}: {
  code: string;
  products: ArtProduct[];
  /** One line under the heading, in the language of the tab it sits in. */
  blurb: string;
  submitted?: boolean;
  error?: string;
  /** A photo didn't make it to storage, even though the rest saved. */
  photoError?: boolean;
}) {
  const errorMessage = error
    ? (PRODUCT_ERROR_MESSAGES[error] ?? PRODUCT_ERROR_MESSAGES.server)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="card-surface rounded-xl p-6">
        <h3 className="font-semibold">Submit products</h3>
        <p className="mt-1 text-sm text-muted">{blurb}</p>

        {submitted && (
          <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 mt-4 rounded-lg border px-4 py-2 text-sm">
            Submitted — we&apos;ll email you once it&apos;s reviewed.
          </p>
        )}
        {submitted && photoError && (
          <div className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-4 rounded-xl border px-5 py-4 text-sm">
            Your details saved, but an image couldn&apos;t be uploaded. Try
            again with a smaller JPG or PNG — if it keeps failing, tell us at
            info@wearewhoa.com and we&apos;ll sort it out.
          </div>
        )}
        {errorMessage && (
          <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-4 rounded-lg border px-4 py-3 text-sm">
            {errorMessage}
          </p>
        )}

        <ArtProductSubmitForm code={code} />
      </div>

      {products.length > 0 && (
        <div>
          <h3 className="font-display text-xl">Your submissions</h3>
          <div className="mt-4 flex flex-col gap-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="card-surface rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{product.name}</p>
                    <p className="text-xs text-muted">
                      {formatCents(product.priceCents)}
                      {product.size ? ` · ${product.size}` : ""}
                      {totalSizeStock(product.sizeStock) > 0
                        ? ` · ${totalSizeStock(product.sizeStock)} in stock`
                        : ""}
                    </p>
                    {totalSizeStock(product.sizeStock) > 0 && (
                      <p className="mt-1 text-xs text-muted">
                        {ART_SIZES.filter(
                          (size) => (product.sizeStock[size] ?? 0) > 0,
                        )
                          .map((size) => `${size} ×${product.sizeStock[size]}`)
                          .join("  ·  ")}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                      product.status === "approved"
                        ? "bg-tier-icon text-background"
                        : product.status === "pending"
                          ? "bg-flame-2/15 text-flame-3"
                          : "border border-border-strong text-muted"
                    }`}
                  >
                    {STATUS_LABEL[product.status]}
                  </span>
                </div>

                {/* Only a live listing can be changed or pulled. A pending
                    one is already in review, and a declined or removed one
                    has nothing in the shop to act on. */}
                {product.status === "approved" && (
                  <ArtProductRequest code={code} product={product} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
