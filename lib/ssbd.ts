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

export interface AreaShift {
  name: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface ScheduleArea {
  id: string;
  label: string;
  // null means the schedule for this area hasn't been shared yet —
  // rendered as "coming soon" rather than faked.
  shifts: AreaShift[] | null;
}

export interface TeamContact {
  role: string;
  // Absent for a shared inbox/line rather than a specific person, e.g.
  // General Questions.
  name?: string;
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
    id: "trainings",
    title: "Two mandatory trainings before SSBD",
    date: "TBD",
    tag: "Urgent",
    body: "Merch & POS Training, then a Merch Refresher + Load-In/Exodus Expectations session. Can't make it live? You must watch the recording and DM us to confirm you watched it — we will ask questions. Dates, topics, and the full policy are in the Training Calendar below.",
    href: "/ssbd-admin#training-calendar",
  },
  {
    id: "runway-show",
    title: "Chill Pill Runway Show",
    date: "During SSBD — Sept 25–27, 2026",
    tag: "Update",
    body: "There's a runway show happening at SSBD, produced by Lily Flores of Chill Pill. Exact time and location within the festival to come — check back here.",
  },
];

export interface TrainingSession {
  id: string;
  title: string;
  date: string;
  time: string;
  topics: string[];
}

export const TRAINING_SESSIONS: TrainingSession[] = [
  {
    id: "merch-pos-training",
    title: "Merch & POS Training",
    date: "TBD",
    time: "TBD",
    topics: [
      "Square POS walkthrough — ringing up items, discounts, card vs. cash",
      "Merch handling, folding, and presentation at the booth",
      "What to do if the card reader loses connection",
    ],
  },
  {
    id: "merch-refresher-loadin",
    title: "Merch Refresher + Load-In/Exodus Expectations",
    date: "TBD",
    time: "TBD",
    topics: [
      "Quick refresher on merch & POS basics",
      "SSBD load-in expectations — timing, what to bring, where to go",
      "SSBD load-out/exodus expectations — teardown, hauling, wrap time",
    ],
  },
];

export const TRAINING_POLICY = {
  attendance:
    "Both trainings are mandatory. If you can't attend live, you must watch the recording and DM us to confirm you watched it — I will ask questions!!!!!!",
  note: "This is for your benefit and the benefit of the team that relies on you. This is our Super Bowl and helps support next year's festival season — so if you're an artist (which we all are!!), treat this like your own brand so we can invite you back. 🫶🏽",
};

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
      "If you aren't scheduled for any load-in or build but would like to help in any way, feel free to come early to help",
      "Exact load-in/load-out times are TBD and will be posted here once confirmed with organizers",
      "General rule is build happens Wednesday / Thursday",
      "Teardown happens Monday morning",
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

export interface Activation {
  id: string;
  title: string;
  date: string;
}

// Extra activations happening at SSBD, beyond the booth itself — dates
// and times TBD until confirmed with organizers.
export const ACTIVATIONS: Activation[] = [
  { id: "silent-discwhoa", title: "SILENT DISCWHOA", date: "TBD" },
  { id: "whoalypics", title: "WHOALYPICS", date: "TBD" },
  { id: "chill-pill-runway-show", title: "CHILL PILL RUNWAY SHOW", date: "TBD" },
];

// One schedule, two areas — WHOADEGA and WHOA OASIS share the same
// Friday/Saturday/Sunday grid but run their own crew and shift times.
export const SCHEDULE_AREAS: ScheduleArea[] = [
  {
    id: "whoadega",
    label: "WHOADEGA",
    shifts: null,
  },
  {
    id: "whoa-oasis",
    label: "WHOA OASIS",
    shifts: [
      { name: "Derek", friday: "10 AM – 6 PM", saturday: "10 AM – 6 PM", sunday: "10 AM – 6 PM" },
      { name: "Mike", friday: "2 PM – 10 PM", saturday: "2 PM – 10 PM", sunday: "2 PM – 10 PM" },
      { name: "Ali", friday: "10 AM – 6 PM", saturday: "2 PM – 10 PM", sunday: "2 PM – 10 PM" },
      { name: "Dylan", friday: "6 PM – 2 AM", saturday: "10 PM – 6 AM", sunday: "8 PM – 4 AM" },
      { name: "#5555", friday: "10 PM – 6 AM", saturday: "10 PM – 6 AM", sunday: "10 PM – 4 AM" },
      { name: "Bryce", friday: "10 PM – 6 AM", saturday: "10 PM – 6 AM", sunday: "6 PM – 2 AM" },
      { name: "James", friday: "10 PM – 6 AM", saturday: "6 PM – 2 AM", sunday: "10 PM – 4 AM" },
    ],
  },
];

export const TEAM_CONTACTS: TeamContact[] = [
  { role: "Whoa / Creation Station Operations", name: "Wasani", contact: "949-690-3690" },
  { role: "Whoadega / Whoa Oasis Director", name: "Nick", contact: "704-280-4148" },
  { role: "Whoadega / Whoa Oasis Director", name: "Vee", contact: "702-715-8031" },
  { role: "WHOA OS Tech Support", name: "Jan", contact: "786-554-5865" },
  { role: "Creation Station Organizers", name: "Sam/Aymé", contact: "N/A" },
  { role: "General Questions", contact: "info@wearewhoa.com" },
];
