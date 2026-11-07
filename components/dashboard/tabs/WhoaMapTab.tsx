import {
  approvePinAction,
  rejectPinAction,
  replacePinAction,
} from "@/app/portal/whoa-map/actions";
import { PIN_KIND_LABELS, placeLabel, type MapPin } from "@/lib/whoaMap";

/**
 * The queue of things strangers have sent in.
 *
 * Deliberately shows the photograph large and the two buttons small.
 * The job here is looking, and a screen that makes the deciding easier
 * than the looking is a screen that gets clicked through.
 */

const ERRORS: Record<string, string> = {
  invalid: "That didn't come through — try again.",
  geocode: "Couldn't find that place. Check the spelling of the city and country.",
  server: "Something went wrong — try again.",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WhoaMapTab({
  pending,
  unplaced,
  approved,
  notice,
  error,
}: {
  pending: MapPin[];
  unplaced: MapPin[];
  approved: number;
  notice?: string;
  error?: string;
}) {
  return (
    <div>
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">WHOA Map</span>
      <h3 className="font-display mt-1 text-2xl">What people have sent in</h3>
      <p className="mt-1 text-sm text-muted">
        Nothing reaches the public map until it is approved here. {approved.toLocaleString()}{" "}
        {approved === 1 ? "pin is" : "pins are"} live.
      </p>

      {error && (
        <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-4 rounded-lg border px-4 py-3 text-sm">
          {ERRORS[error] ?? ERRORS.server}
        </p>
      )}
      {notice && (
        <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 mt-4 rounded-lg border px-4 py-2 text-sm">
          {notice}
        </p>
      )}

      <h4 className="mt-8 font-semibold">
        Waiting {pending.length > 0 && <span className="text-flame">({pending.length})</span>}
      </h4>

      {pending.length === 0 ? (
        <p className="an-empty">Nothing waiting. Everything sent in has been looked at.</p>
      ) : (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pending.map((pin) => (
            <li key={pin.id} className="overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pin.photoUrl}
                alt={`Submitted ${PIN_KIND_LABELS[pin.kind]} from ${placeLabel(pin)}`}
                className="aspect-square w-full object-cover"
              />
              <div className="p-3">
                <p
                  className="text-[11px] font-semibold tracking-[0.14em] uppercase"
                  style={{ color: pin.kind === "sticker" ? "#29e6ff" : "#ff7a00" }}
                >
                  {PIN_KIND_LABELS[pin.kind]}
                </p>
                <p className="mt-0.5 text-sm">{placeLabel(pin)}</p>
                <p className="text-xs text-muted">
                  {pin.uploadedBy} · {when(pin.submittedAt)}
                </p>
                {/* A dropped pin is a claim somebody made about a
                    specific corner; a geocoded one is only ever as
                    good as the city. Worth saying which is which to
                    whoever is deciding. */}
                {pin.latitude !== null && pin.longitude !== null && (
                  <p className="mt-1 text-xs text-muted">
                    📍 {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                    {pin.locatedBy === "device" ? " · from their phone" : " · dropped by hand"}
                  </p>
                )}

                <div className="mt-3 flex gap-2">
                  <form action={approvePinAction}>
                    <input type="hidden" name="id" value={pin.id} />
                    <button type="submit" className="ba-btn">
                      APPROVE
                    </button>
                  </form>
                  <form action={rejectPinAction}>
                    <input type="hidden" name="id" value={pin.id} />
                    <button
                      type="submit"
                      className="border-border-strong hover:text-flame-3 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Approved but with no point on the map, so invisible. Worth its
          own section rather than a flag on a row somewhere: these are
          pins somebody said yes to that nobody can see. */}
      {unplaced.length > 0 && (
        <>
          <h4 className="mt-10 font-semibold">Approved but not on the map</h4>
          <p className="mt-1 text-sm text-muted">
            We couldn&apos;t find these places. Usually a spelling, sometimes a town the geocoder
            has never heard of.
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {unplaced.map((pin) => (
              <li key={pin.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{placeLabel(pin)}</p>
                  <p className="truncate text-xs text-muted">
                    {PIN_KIND_LABELS[pin.kind]} · {pin.uploadedBy}
                  </p>
                </div>
                <form action={replacePinAction}>
                  <input type="hidden" name="id" value={pin.id} />
                  <button type="submit" className="ba-btn">
                    TRY AGAIN
                  </button>
                </form>
                <form action={rejectPinAction}>
                  <input type="hidden" name="id" value={pin.id} />
                  <button
                    type="submit"
                    className="border-border-strong hover:text-flame-3 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors"
                  >
                    Take it down
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
