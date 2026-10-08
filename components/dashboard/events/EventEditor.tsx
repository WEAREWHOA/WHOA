import Link from "next/link";
import { saveEventAction } from "@/app/events-admin/actions";
import { EVENT_CATEGORIES } from "@/lib/events";
import type { CustomEventRecord } from "@/lib/eventsStore";
import { portalPath } from "@/lib/portalNav";

/**
 * Creating or editing an event.
 *
 * A page rather than a modal, because this is a long form and losing it
 * to a stray click outside would be unforgivable. Same shape as the blog
 * editor next door, for the same reason.
 */

const FIELD =
  "mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2";
const LABEL = "text-sm font-medium";

function money(cents: number | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

export default function EventEditor({ event }: { event: CustomEventRecord | null }) {
  return (
    <div className="card-surface rounded-xl p-6">
      <h3 className="font-semibold">{event ? "Edit event" : "New event"}</h3>
      <p className="mt-1 text-sm text-muted">
        Saved as a draft until you publish it. A draft is invisible to the public but still shows
        here, so an event can be built over a few days before it is announced.
      </p>

      <form action={saveEventAction} className="mt-5 flex flex-col gap-5">
        {event && <input type="hidden" name="id" value={event.id} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-title" className={LABEL}>Title</label>
            <input id="ev-title" name="title" defaultValue={event?.title ?? ""} required maxLength={200} className={FIELD} />
          </div>
          <div>
            <label htmlFor="ev-category" className={LABEL}>Category</label>
            <select id="ev-category" name="category" defaultValue={event?.category ?? "shows"} className={FIELD}>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {!event && (
          <div>
            <label htmlFor="ev-slug" className={LABEL}>
              Event ID <span className="font-normal text-muted">(leave blank to build it from the title)</span>
            </label>
            <input id="ev-slug" name="slug" className={FIELD} placeholder="whoadega-halloween-2026" />
            <p className="mt-2 text-xs text-muted">
              Every ticket, QR code and guest record is written against this, so it cannot be
              changed afterwards. It is the one field here that is permanent.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-start" className={LABEL}>Starts</label>
            <input id="ev-start" type="date" name="startDate" defaultValue={event?.startDate ?? ""} required className={FIELD} />
          </div>
          <div>
            <label htmlFor="ev-end" className={LABEL}>
              Ends <span className="font-normal text-muted">(only for a multi-day event)</span>
            </label>
            <input id="ev-end" type="date" name="endDate" defaultValue={event?.endDate ?? ""} className={FIELD} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-datelabel" className={LABEL}>Date, as the flyer says it</label>
            <input id="ev-datelabel" name="dateLabel" defaultValue={event?.dateLabel ?? ""} className={FIELD} placeholder="Sat 31 Oct" />
          </div>
          <div>
            <label htmlFor="ev-timelabel" className={LABEL}>Time</label>
            <input id="ev-timelabel" name="timeLabel" defaultValue={event?.timeLabel ?? ""} className={FIELD} placeholder="7PM til late" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ev-venue" className={LABEL}>Venue</label>
            <input id="ev-venue" name="venue" defaultValue={event?.venue ?? ""} className={FIELD} placeholder="The WHOADEGA" />
          </div>
          <div>
            <label htmlFor="ev-location" className={LABEL}>Address</label>
            <input id="ev-location" name="location" defaultValue={event?.location ?? ""} className={FIELD} placeholder="4847 Newport Ave, Ocean Beach" />
            <p className="mt-2 text-xs text-muted">
              Used for the map link, and for the pop-up entry on /stores when it is not at the shop.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="ev-image" className={LABEL}>Flyer image URL</label>
          <input id="ev-image" name="imageUrl" defaultValue={event?.imageUrl ?? ""} className={FIELD} placeholder="https://..." />
          <p className="mt-2 text-xs text-muted">
            Upload it in the Images panel at the bottom of this tab, then paste the URL here. Left
            blank, the card uses the gradient below instead.
          </p>
        </div>

        <div>
          <label htmlFor="ev-lineup" className={LABEL}>
            Lineup <span className="font-normal text-muted">(one per line)</span>
          </label>
          <textarea id="ev-lineup" name="lineup" rows={4} defaultValue={event?.lineup?.join("\n") ?? ""} className={FIELD} />
          <p className="mt-2 text-xs text-muted">
            Guests pick who they are coming for, and the answers are broken down per event below.
          </p>
        </div>

        <div>
          <label htmlFor="ev-details" className={LABEL}>
            Details <span className="font-normal text-muted">(one bullet per line)</span>
          </label>
          <textarea id="ev-details" name="details" rows={4} defaultValue={event?.details?.join("\n") ?? ""} className={FIELD} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ev-price" className={LABEL}>Ticket price</label>
            <input id="ev-price" name="price" type="number" step="0.01" min="0" defaultValue={money(event?.priceCents)} className={FIELD} placeholder="Blank = free RSVP" />
          </div>
          <div>
            <label htmlFor="ev-early" className={LABEL}>Early bird price</label>
            <input id="ev-early" name="earlyBirdPrice" type="number" step="0.01" min="0" defaultValue={money(event?.earlyBirdPriceCents)} className={FIELD} />
            <p className="mt-2 text-xs text-muted">In effect until doors. The price above is the door price from then on.</p>
          </div>
          <div>
            <label htmlFor="ev-capacity" className={LABEL}>Capacity</label>
            <input id="ev-capacity" name="capacity" type="number" min="1" step="1" defaultValue={event?.capacity ?? ""} className={FIELD} placeholder="Blank = unlimited" />
            <p className="mt-2 text-xs text-muted">
              Counted in people, not bookings. Checked before a card is charged.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="ev-href" className={LABEL}>
            External ticket link <span className="font-normal text-muted">(only if tickets are sold elsewhere)</span>
          </label>
          <input id="ev-href" name="href" defaultValue={event?.href ?? ""} className={FIELD} placeholder="https://..." />
          <p className="mt-2 text-xs text-muted">
            Set this and the card links out instead of selling. It cannot be combined with a price:
            a card with both a Buy button and an outbound link has no right answer for which wins.
          </p>
        </div>

        <details className="rounded-lg border border-border-strong p-4">
          <summary className="cursor-pointer text-sm font-medium">Card appearance</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ev-accent" className={LABEL}>Accent colour</label>
              <input id="ev-accent" name="accent" defaultValue={event?.accent ?? "#ff7a00"} className={FIELD} />
            </div>
            <div>
              <label htmlFor="ev-rotate" className={LABEL}>Tilt</label>
              <input id="ev-rotate" name="rotate" type="number" step="0.5" min="-6" max="6" defaultValue={event?.rotate ?? 0} className={FIELD} />
            </div>
            <div>
              <label htmlFor="ev-g1" className={LABEL}>Gradient 1</label>
              <input id="ev-g1" name="gradient1" defaultValue={event?.gradient?.[0] ?? ""} className={FIELD} />
            </div>
            <div>
              <label htmlFor="ev-g2" className={LABEL}>Gradient 2</label>
              <input id="ev-g2" name="gradient2" defaultValue={event?.gradient?.[1] ?? ""} className={FIELD} />
            </div>
            <div>
              <label htmlFor="ev-g3" className={LABEL}>Gradient 3</label>
              <input id="ev-g3" name="gradient3" defaultValue={event?.gradient?.[2] ?? ""} className={FIELD} />
            </div>
            <div>
              <label htmlFor="ev-tags" className={LABEL}>
                Tags <span className="font-normal text-muted">(comma separated)</span>
              </label>
              <input id="ev-tags" name="tags" defaultValue={event?.tags?.join(", ") ?? ""} className={FIELD} />
            </div>
          </div>
        </details>

        <div className="flex flex-wrap gap-3">
          <button type="submit" name="intent" value="draft" className="rounded-full border border-border-strong px-6 py-2.5 text-sm font-semibold tracking-wide uppercase hover:border-flame-2/50">
            Save draft
          </button>
          <button type="submit" name="intent" value="publish" className="btn-flame rounded-full px-6 py-2.5 text-sm font-semibold tracking-wide uppercase">
            {event?.published ? "Update live event" : "Publish"}
          </button>
          <Link href={portalPath("events-admin")} className="self-center text-sm text-muted hover:text-foreground">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
