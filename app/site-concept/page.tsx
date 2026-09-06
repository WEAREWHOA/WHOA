import Link from "next/link";
import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";

export const metadata: Metadata = {
  title: "Site Concept",
  description:
    "Every kind of person who comes to WHOA — customers, event goers, artists, musicians, vendors, ambassadors, sales crew, staff — and the path each one takes through the site.",
};

interface Step {
  label: string;
  href?: string;
  note?: string;
}

interface Journey {
  who: string;
  /** How this person arrives — the top of their funnel. */
  entry: string;
  accent: string;
  steps: Step[];
  /** Where they end up once they're through. */
  ends: string;
}

// Every route and permission named here is real — the funnels are read off
// the actual flows (see the README sections each one mirrors), not sketched.
// The order runs from "just buying something" out to "runs the place".
const JOURNEYS: Journey[] = [
  {
    who: "Customer",
    entry: "Finds us — socials, the shop itself, or walking past the WHOADEGA",
    accent: "#29e6ff",
    steps: [
      { label: "Shop", href: "/shop", note: "live Square catalog" },
      { label: "Product", href: "/shop", note: "pick size & colour" },
      { label: "Cart", href: "/cart" },
      { label: "Checkout", href: "/checkout", note: "card, via Square" },
      { label: "Confirmed", href: "/order-confirmed", note: "emailed a receipt" },
    ],
    ends: "Their CUSTOMER tab shows every purchase they've ever made with us — in person or online — matched by email.",
  },
  {
    who: "Referred shopper",
    entry: "Clicks an ambassador's link, or types their code at checkout",
    accent: "#ff2fb0",
    steps: [
      { label: "Their link", href: "/ambassadors", note: "/r/<code>" },
      { label: "Shop", href: "/shop", note: "30-day cookie set" },
      { label: "Checkout", href: "/checkout", note: "15% off applied" },
    ],
    ends: "Same customer journey — but the sale is credited back, and 10% commission is recorded for whoever sent them.",
  },
  {
    who: "Event goer",
    entry: "Sees a flyer, a repost, or the calendar",
    accent: "#ff8a29",
    steps: [
      { label: "Events", href: "/events", note: "calendar + flyer archive" },
      { label: "Pick an event", href: "/events" },
      { label: "RSVP or ticket", href: "/events", note: "waiver where needed" },
      { label: "QR ticket" },
    ],
    ends: "Their EVENTS tab holds every ticket and QR code, ready to scan at the door.",
  },
  {
    who: "Brand ambassador",
    entry: "Wants to earn from sending people our way",
    accent: "#ffd23f",
    steps: [
      { label: "Apply", href: "/apply", note: "approved instantly" },
      { label: "Account + code", note: "e.g. JANEDOE" },
      { label: "Link & promo code", note: "created automatically" },
    ],
    ends: "BRAND AMBASSADORS tab: trackable links, live click and sale stats, commission owed, and payout details.",
  },
  {
    who: "Artist",
    entry: "Makes things and wants to sell them with us",
    accent: "#fff229",
    steps: [
      { label: "Apply", href: "/art-collective/apply", note: "profile saved as you type it" },
      { label: "We review", note: "approve from the email" },
      { label: "ART tab unlocked" },
      { label: "Submit products", note: "up to 5 at a time" },
      { label: "Approved → Square" },
    ],
    ends: "Their work goes live on the shop and on their own Art Collective page, with real sales and inventory in their tab.",
  },
  {
    who: "Musician",
    entry: "Plays, produces, or DJs and wants to be part of it",
    accent: "#baff29",
    steps: [
      { label: "Apply", href: "/music-collective/apply" },
      { label: "We review" },
      { label: "MUSIC tab unlocked" },
      { label: "Edit their profile", note: "bio, genre, links" },
    ],
    ends: "Their profile is live on the Music Collective page, and stays theirs to edit.",
  },
  {
    who: "Vendor",
    entry: "Already stocked in the WHOADEGA",
    accent: "#7b2ff7",
    steps: [
      { label: "On the roster", href: "/art-collective", note: "curated list" },
      { label: "Account linked", note: "by a Super Admin" },
      { label: "ARTIST/VENDOR tab" },
    ],
    ends: "They see their own sales and stock levels, pulled straight from Square — no spreadsheet, no asking.",
  },
  {
    who: "Event sales crew",
    entry: "Wants to work events and festivals with us",
    accent: "#b829ff",
    steps: [
      { label: "Apply", href: "/sell-for-us" },
      { label: "We review" },
      { label: "EVENT SALES tab" },
      { label: "Sign up for shifts" },
    ],
    ends: "Once they're on an event, they get its crew hub — schedule, training, contacts, load-in — like the SSBD one.",
  },
  {
    who: "Staff at the register",
    entry: "Working the shop floor or a pop-up",
    accent: "#f7f0e6",
    steps: [
      { label: "Open the register", href: "/pos", note: "PIN gated" },
      { label: "Ring up a sale" },
      { label: "Take payment", note: "same Square account" },
    ],
    ends: "In-person sales hit the same catalog, stock and order history as the website — one set of numbers, not two.",
  },
  {
    who: "Admin",
    entry: "Runs events, reviews submissions, or holds the keys",
    accent: "#ff2f1a",
    steps: [
      { label: "Log in", href: "/login" },
      { label: "Events Admin", note: "guest lists, KPIs, shift approvals" },
      { label: "Art Admin", note: "approve submitted products" },
      { label: "Super Admin", href: "/super-admin", note: "grants every permission" },
    ],
    ends: "Admin tabs are the same dashboard, with more unlocked — there's no separate back office to log into.",
  },
];

// The left-hand doors and right-hand tabs of the fan diagram. Kept in step
// with JOURNEYS above, but shorter, because they're SVG labels.
const DOORS = JOURNEYS.map((j) => ({ label: j.who, accent: j.accent }));

const TABS: { label: string; accent: string }[] = [
  { label: "CUSTOMER", accent: "#29e6ff" },
  { label: "EVENTS", accent: "#ff8a29" },
  { label: "BRAND AMBASSADORS", accent: "#ffd23f" },
  { label: "ART", accent: "#fff229" },
  { label: "MUSIC", accent: "#baff29" },
  { label: "ARTIST/VENDOR", accent: "#7b2ff7" },
  { label: "EVENT SALES", accent: "#b829ff" },
  { label: "SSBD", accent: "#ff5f9e" },
  { label: "EVENTS / ART ADMIN", accent: "#ff2f1a" },
  { label: "SETTINGS", accent: "#a89686" },
];

const VIEW_W = 1100;
const VIEW_H = 660;
const DOOR_X = 232;
const HUB_X = 550;
const TAB_X = 812;
const HUB_Y = VIEW_H / 2;
const HUB_R = 74;

/** Evenly spreads `count` nodes down the diagram, inset from both edges. */
function columnY(index: number, count: number): number {
  const top = 46;
  const bottom = VIEW_H - 46;
  if (count <= 1) return HUB_Y;
  return top + ((bottom - top) * index) / (count - 1);
}

/**
 * A flat-ish S-curve from one node to another. Control points sit on the
 * horizontal midpoint so every strand leaves and arrives level, which reads
 * as flow rather than as a bundle of straight lines crossing.
 */
function curve(x1: number, y1: number, x2: number, y2: number): string {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

function JourneyCard({ journey }: { journey: Journey }) {
  return (
    <li className="card-surface relative overflow-hidden rounded-2xl border border-border p-5 sm:p-6">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: journey.accent }}
        aria-hidden
      />

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-display text-xl tracking-wide" style={{ color: journey.accent }}>
          {journey.who}
        </h3>
        <p className="text-xs text-muted">{journey.entry}</p>
      </div>

      <ol className="mt-4 flex flex-wrap items-stretch gap-2">
        {journey.steps.map((step, i) => (
          <li key={`${journey.who}-${step.label}`} className="flex items-stretch gap-2">
            {i > 0 && (
              <span className="self-center text-sm text-muted" aria-hidden>
                →
              </span>
            )}
            {step.href ? (
              <Link
                href={step.href}
                className="flex flex-col justify-center rounded-xl border px-3 py-2 transition-colors hover:border-flame-2/60"
                style={{ borderColor: `${journey.accent}44` }}
              >
                <span className="text-sm font-semibold text-foreground">{step.label}</span>
                {step.note && <span className="text-[0.7rem] text-muted">{step.note}</span>}
              </Link>
            ) : (
              <span
                className="flex flex-col justify-center rounded-xl border px-3 py-2"
                style={{ borderColor: `${journey.accent}22` }}
              >
                <span className="text-sm font-semibold text-foreground">{step.label}</span>
                {step.note && <span className="text-[0.7rem] text-muted">{step.note}</span>}
              </span>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm leading-relaxed text-muted">{journey.ends}</p>
    </li>
  );
}

export default function SiteConceptPage() {
  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 max-w-2xl text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          How it&apos;s built
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          Site Concept
        </h1>
        <p className="mt-4 text-sm text-white/70 sm:text-base">
          People arrive at WHOA through a lot of different doors — to buy something, to catch a
          show, to sell their art, to play, to work an event. Every one of those is its own funnel.
          They all lead to the same place: one account, with different things unlocked inside it.
        </p>
      </div>

      {/* The fan: many ways in on the left, one account in the middle, the
          tabs it can unlock on the right. Desktop only — shrunk to a phone
          the labels would be unreadable, and the cards below say the same
          thing in a form that reads at any width. */}
      <div className="relative z-10 mt-12 hidden w-full max-w-5xl md:block">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Diagram: ten kinds of people enter WHOA through their own route, all converge on a single account, which unlocks different dashboard tabs depending on who they are."
        >
          {DOORS.map((door, i) => (
            <path
              key={`in-${door.label}`}
              d={curve(DOOR_X + 8, columnY(i, DOORS.length), HUB_X - HUB_R, HUB_Y)}
              fill="none"
              stroke={door.accent}
              strokeWidth={1.6}
              strokeOpacity={0.55}
            />
          ))}

          {TABS.map((tab, i) => (
            <path
              key={`out-${tab.label}`}
              d={curve(HUB_X + HUB_R, HUB_Y, TAB_X - 8, columnY(i, TABS.length))}
              fill="none"
              stroke={tab.accent}
              strokeWidth={1.6}
              strokeOpacity={0.4}
            />
          ))}

          {DOORS.map((door, i) => {
            const y = columnY(i, DOORS.length);
            return (
              <g key={`door-${door.label}`}>
                <circle cx={DOOR_X} cy={y} r={7} fill={door.accent} />
                <text
                  x={DOOR_X - 18}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[13px] font-semibold"
                  style={{ fill: "#f7f0e6" }}
                >
                  {door.label}
                </text>
              </g>
            );
          })}

          {TABS.map((tab, i) => {
            const y = columnY(i, TABS.length);
            return (
              <g key={`tab-${tab.label}`}>
                <circle cx={TAB_X} cy={y} r={6} fill={tab.accent} />
                <text
                  x={TAB_X + 16}
                  y={y + 4}
                  className="text-[12px] font-semibold tracking-wide"
                  style={{ fill: tab.accent }}
                >
                  {tab.label}
                </text>
              </g>
            );
          })}

          <circle cx={HUB_X} cy={HUB_Y} r={HUB_R} fill="#0a0116" stroke="#f7f0e6" strokeWidth={2} />
          <text
            x={HUB_X}
            y={HUB_Y - 6}
            textAnchor="middle"
            className="font-display text-[20px]"
            style={{ fill: "#f7f0e6" }}
          >
            ONE
          </text>
          <text
            x={HUB_X}
            y={HUB_Y + 16}
            textAnchor="middle"
            className="font-display text-[20px]"
            style={{ fill: "#f7f0e6" }}
          >
            ACCOUNT
          </text>

          <text
            x={DOOR_X}
            y={22}
            textAnchor="middle"
            className="text-[11px] font-semibold tracking-[0.2em] uppercase"
            style={{ fill: "#a89686" }}
          >
            Who shows up
          </text>
          <text
            x={TAB_X + 16}
            y={22}
            className="text-[11px] font-semibold tracking-[0.2em] uppercase"
            style={{ fill: "#a89686" }}
          >
            What unlocks
          </text>
        </svg>
      </div>

      <div className="relative z-10 mt-16 w-full max-w-4xl">
        <h2 className="font-display text-2xl tracking-wide sm:text-3xl">The journeys</h2>
        <p className="mt-2 text-sm text-muted">
          Each row is one kind of person, from how they find us to what they end up with. Boxes
          with a border you can click are real pages you can open right now.
        </p>

        <ol className="mt-6 flex flex-col gap-4">
          {JOURNEYS.map((journey) => (
            <JourneyCard key={journey.who} journey={journey} />
          ))}
        </ol>
      </div>

      <div className="card-surface relative z-10 mt-16 w-full max-w-4xl rounded-2xl border border-border p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-wide">Why it&apos;s one account</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          A customer, an ambassador, an artist, a musician, a vendor, event sales crew, an admin —
          every one of them is the same kind of record, logged in through the same door. What
          differs is only which tabs a Super Admin has unlocked. That&apos;s why the same person can
          be several things at once without juggling logins: an artist who also shops, a customer
          who signs up to work an event, a musician who becomes an ambassador. Apply for something
          on the front of the site and, once approved, the matching tab simply appears the next time
          they log in.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Underneath, every one of these journeys talks to the same three services.{" "}
          <span className="text-foreground font-semibold">Square</span> holds the real product
          catalog, inventory and payments — the website and the in-person register share one set of
          numbers. <span className="text-foreground font-semibold">Supabase</span> is the database
          behind every account, permission, RSVP and submission.{" "}
          <span className="text-foreground font-semibold">Resend</span> sends every confirmation and
          staff notification, including the one-click Approve/Decline buttons that let staff review
          an application straight from their inbox.
        </p>
      </div>
    </section>
  );
}
