export interface Announcement {
  id: string;
  title: string;
  date: string;
  body: string;
  tag?: "Urgent" | "Update" | "Reminder";
  href?: string;
}

export interface CrewDoc {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string[];
}

export interface ShiftDay {
  label: string;
  date: string;
  note: string;
}

export interface TeamContact {
  role: string;
  name: string;
  contact: string;
}

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "welcome",
    title: "Welcome to the SSBD Crew Hub",
    date: "Posted now",
    tag: "Update",
    body: "This is home base for everything you need to help build, sell, and run the WHOADEGA booth at Same Same But Different, September 25–27, 2026 at Lake Perris, CA. Check back here for the latest before and during the festival.",
    href: "/ssbd-admin/welcome-guide",
  },
  {
    id: "build-day",
    title: "Booth build day — details coming soon",
    date: "TBD",
    tag: "Reminder",
    body: "Exact load-in time and the crew call sheet will be posted here as soon as they're locked in with festival organizers. Keep an eye on this page in the weeks leading up to the event.",
  },
  {
    id: "pos-training",
    title: "Merch & POS training",
    date: "TBD",
    tag: "Update",
    body: "If you're working the register, get comfortable with the Square POS before doors open. A quick-reference guide is in Documents & Resources below.",
  },
];

export const DOCS: CrewDoc[] = [
  {
    id: "booth-setup",
    title: "Booth Setup Checklist",
    category: "Build",
    summary: "What to run through before the booth opens for the day.",
    body: [
      "Canopy/tent assembled and weighted down",
      "Tables and merch racks in place per the layout plan",
      "Signage and WHOADEGA banner hung and visible",
      "Lighting and power tested",
      "Merch inventory counted against the manifest",
      "POS device charged, connected, and logged in",
      "Cash box set with the starting float",
      "First aid kit and fire extinguisher on site",
    ],
  },
  {
    id: "pos-quick-reference",
    title: "Square POS Quick Reference",
    category: "Sales",
    summary: "The basics for anyone working the register.",
    body: [
      "Ring up items from the catalog — double check size/variant before completing the sale",
      "Ambassador discount codes apply 15% off automatically at checkout",
      "Card is preferred, but cash is accepted — always count change back out loud",
      "If the card reader loses connection, switch to manual entry or flag your team lead",
      "At the end of your shift, count the till and log the total before handing off",
    ],
  },
  {
    id: "load-schedule",
    title: "Load-In & Load-Out Schedule",
    category: "Logistics",
    summary: "General timing — exact hours will be confirmed closer to the festival.",
    body: [
      "Exact load-in/load-out times are TBD and will be posted here once confirmed with organizers",
      "General rule of thumb: build happens 1–2 days before doors open",
      "Teardown typically happens the day after the festival wraps",
      "Bring a hand truck or dolly if you're helping haul merch and fixtures",
    ],
  },
  {
    id: "code-of-conduct",
    title: "Crew Code of Conduct",
    category: "General",
    summary: "How we represent WHOA at the booth.",
    body: [
      "Be warm and welcoming — you're often someone's first impression of WHOA",
      "No unauthorized discounts or freebies without a team lead's OK",
      "Keep the booth clean, stocked, and looking sharp all day",
      "Text or radio your team lead if you need a break or backup",
      "Safety first, always — say something if anything feels off",
    ],
  },
];

export const SHIFT_DAYS: ShiftDay[] = [
  { label: "Friday", date: "Sept 25, 2026", note: "Shift times TBD — talk to your team lead to grab a slot." },
  { label: "Saturday", date: "Sept 26, 2026", note: "Shift times TBD — talk to your team lead to grab a slot." },
  { label: "Sunday", date: "Sept 27, 2026", note: "Shift times TBD — talk to your team lead to grab a slot." },
];

export const TEAM_CONTACTS: TeamContact[] = [
  { role: "Booth Lead", name: "Add name", contact: "Add phone or email" },
  { role: "Merch Lead", name: "Add name", contact: "Add phone or email" },
  { role: "POS / Sales Lead", name: "Add name", contact: "Add phone or email" },
  { role: "General Questions", name: "Add name", contact: "Add phone or email" },
];
