import { formatCents } from "@/lib/money";
import type { ArtProduct, PendingArtBatch } from "@/lib/artCollective";
import {
  reviewArtBatchAction,
  reviewArtProductAction,
  reviewArtProductRequestAction,
} from "@/app/art-admin/actions";

function ProductRow({ product }: { product: PendingArtBatch["products"][number] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="flex items-center gap-3">
        {product.photoUrls[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.photoUrls[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
        )}
        <div>
          <p className="text-sm font-semibold">{product.name}</p>
          <p className="text-xs text-muted">
            {formatCents(product.priceCents)}
            {product.size ? ` · ${product.size}` : ""} ·{" "}
            {product.alsoRetailEvents ? "Retail + events" : "Online store only"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <form action={reviewArtProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="decision" value="approved" />
          <button
            type="submit"
            className="rounded-full bg-tier-icon px-4 py-2 text-xs font-semibold tracking-wide text-background uppercase"
          >
            Approve
          </button>
        </form>
        <form action={reviewArtProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="decision" value="declined" />
          <button
            type="submit"
            className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
          >
            Decline
          </button>
        </form>
      </div>
    </div>
  );
}

function BatchCard({ batch }: { batch: PendingArtBatch }) {
  return (
    <div className="card-surface rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{batch.accountName}</p>
          <p className="text-xs text-muted">{batch.accountEmail}</p>
        </div>
        {batch.products.length > 1 && (
          <div className="flex shrink-0 gap-2">
            <form action={reviewArtBatchAction}>
              <input type="hidden" name="batchId" value={batch.batchId} />
              <input type="hidden" name="decision" value="approved" />
              <button
                type="submit"
                className="rounded-full bg-tier-icon px-4 py-2 text-xs font-semibold tracking-wide text-background uppercase"
              >
                Approve all {batch.products.length}
              </button>
            </form>
            <form action={reviewArtBatchAction}>
              <input type="hidden" name="batchId" value={batch.batchId} />
              <input type="hidden" name="decision" value="declined" />
              <button
                type="submit"
                className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
              >
                Decline all
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="mt-3">
        {batch.products.map((product) => (
          <ProductRow key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

/**
 * One artist's ask about a product that's already live. Shows the current
 * value next to the proposed one, because "approve" here rewrites a real
 * Square listing and the difference is the whole decision.
 */
function RequestCard({ product }: { product: ArtProduct & { artistName: string } }) {
  const changes = product.pendingChanges ?? {};
  const isRemoval = product.pendingAction === "removal";

  return (
    <div className="card-surface rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {product.name}
            <span className="ml-2 text-xs font-normal text-muted">{product.artistName}</span>
          </p>
          <p
            className={`mt-1 text-xs font-semibold tracking-wide uppercase ${
              isRemoval ? "text-flame-3" : "text-muted"
            }`}
          >
            {isRemoval ? "Wants it taken down" : "Wants changes"}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <form action={reviewArtProductRequestAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="decision" value="approved" />
            <button
              type="submit"
              className="bg-tier-icon text-background rounded-full px-4 py-2 text-xs font-semibold tracking-wide uppercase"
            >
              {isRemoval ? "Take it down" : "Apply changes"}
            </button>
          </form>
          <form action={reviewArtProductRequestAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="decision" value="declined" />
            <button
              type="submit"
              className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
            >
              Decline
            </button>
          </form>
        </div>
      </div>

      {!isRemoval && (
        <dl className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-xs">
          {changes.name && (
            <div className="flex gap-2">
              <dt className="text-muted">Name</dt>
              <dd>
                <s className="text-muted">{product.name}</s> → {changes.name}
              </dd>
            </div>
          )}
          {changes.price_cents !== undefined && (
            <div className="flex gap-2">
              <dt className="text-muted">Price</dt>
              <dd>
                <s className="text-muted">{formatCents(product.priceCents)}</s> →{" "}
                {formatCents(changes.price_cents)}
              </dd>
            </div>
          )}
          {changes.size && (
            <div className="flex gap-2">
              <dt className="text-muted">Size</dt>
              <dd>
                <s className="text-muted">{product.size ?? "Default"}</s> → {changes.size}
              </dd>
            </div>
          )}
          {changes.description && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted">Description</dt>
              <dd>{changes.description}</dd>
            </div>
          )}
          {changes.details && (
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted">Details</dt>
              <dd>{changes.details}</dd>
            </div>
          )}
        </dl>
      )}

      {product.pendingNote && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
          &ldquo;{product.pendingNote}&rdquo;
        </p>
      )}
    </div>
  );
}

export default function ArtAdminTab({
  batches,
  requests,
}: {
  batches: PendingArtBatch[];
  requests: (ArtProduct & { artistName: string })[];
}) {
  return (
    <div>
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Art Admin</span>
      <h3 className="font-display mt-1 text-2xl">Product submissions</h3>
      <p className="mt-1 text-sm text-muted">
        Approving pushes a product straight into the Square Catalog — it shows in the online store
        immediately.
      </p>

      <div className="mt-6">
        {batches.length === 0 ? (
          <p className="rounded-xl border border-border px-5 py-4 text-sm text-muted">
            No pending product submissions.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {batches.map((batch) => (
              <BatchCard key={batch.batchId} batch={batch} />
            ))}
          </div>
        )}
      </div>

      <h3 className="font-display mt-10 text-2xl">Change &amp; removal requests</h3>
      <p className="mt-1 text-sm text-muted">
        Asked for by artists about products already live. Approving an edit rewrites the Square
        listing; approving a removal deletes it from the catalog — their sales history stays either
        way.
      </p>

      <div className="mt-6">
        {requests.length === 0 ? (
          <p className="rounded-xl border border-border px-5 py-4 text-sm text-muted">
            No open requests.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {requests.map((product) => (
              <RequestCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
