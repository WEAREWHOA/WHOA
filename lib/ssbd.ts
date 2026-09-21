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
  // Listed separately where an area runs managers on their own rota, as
  // WHOA OASIS does — crew need to know who's the lead on their shift, and
  // folding them into the same table loses that.
  managers?: AreaShift[];
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
    href: "/event-sales/welcome-guide",
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
    href: "/event-sales/ssbd-2026#training-calendar",
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
    summary:
      "General timing — exact hours will be confirmed closer to the festival.",
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

/** The festival runs Friday–Sunday; "TBD" is for anything not yet placed. */
export type ActivationDay = "Friday" | "Saturday" | "Sunday" | "TBD";

export interface Activation {
  id: string;
  title: string;
  day: ActivationDay;
  /** Clock window as crew say it out loud, e.g. "11:15 PM–1:15 AM". */
  time: string;
  /** A named guest running it, where it isn't WHOA crew. */
  by?: string;
  /** Anything else crew need that the day and time don't cover. */
  note?: string;
}

// Everything WHOA is running at SSBD beyond the booth itself, in the order
// it happens. Each one is its own card on the crew page, so the list stays
// authored flat rather than nested by day.
//
// Times that cross midnight are written the way they're said out loud
// ("11:15 PM–1:15 AM"), not normalised to a 24-hour range: this is a
// run-of-show for people on their feet, not a scheduling API.
export const ACTIVATIONS: Activation[] = [
  {
    id: "opening-gallery-soiree",
    title: "Opening Gallery Soirée: A Cheese & Jazz Experience",
    day: "Friday",
    time: "6–8 PM",
    by: "Julien Cantlem",
  },
  {
    id: "silent-discwhoa-friday",
    title: "Silent DiscWHOA",
    day: "Friday",
    time: "11 PM–1 AM",
  },
  {
    id: "ecstatic-paint-party",
    title: "Ecstatic Paint Party",
    day: "Saturday",
    time: "2–3 PM",
  },
  {
    id: "wasani-whoa",
    title: "Wasani WHOA",
    day: "Saturday",
    time: "10:20 PM–11:10 PM",
  },
  {
    id: "silent-discwhoa-saturday",
    title: "Silent DiscWHOA",
    day: "Saturday",
    time: "11:15 PM–1:15 AM",
  },
  {
    id: "whoalympics",
    title: "WHOALYMPICS",
    day: "Sunday",
    time: "4–5 PM",
  },
];

// Two areas — the ART GALLERY and WHOA OASIS — sharing the same
// Friday/Saturday/Sunday grid but running their own crew and shift times.
export const SCHEDULE_AREAS: ScheduleArea[] = [
  {
    id: "art-gallery",
    label: "ART GALLERY",
    shifts: [
      { name: "Derek", friday: "10 AM – 6 PM", saturday: "10 AM – 6 PM", sunday: "10 AM – 6 PM" },
      { name: "Mike", friday: "2 PM – 10 PM", saturday: "2 PM – 10 PM", sunday: "2 PM – 10 PM" },
      { name: "Ali", friday: "10 AM – 6 PM", saturday: "2 PM – 10 PM", sunday: "2 PM – 10 PM" },
      { name: "Dylan", friday: "6 PM – 2 AM", saturday: "10 PM – 6 AM", sunday: "8 PM – 4 AM" },
      { name: "Julianna", friday: "10 PM – 6 AM", saturday: "10 PM – 6 AM", sunday: "10 PM – 4 AM" },
      { name: "Bryce S", friday: "10 PM – 6 AM", saturday: "10 PM – 6 AM", sunday: "6 PM – 2 AM" },
      // OFF is a real entry, not a blank: a crew member reading their row
      // needs to see the day accounted for, not wonder if it's missing.
      { name: "James", friday: "OFF", saturday: "6 PM – 2 AM", sunday: "10 PM – 4 AM" },
    ],
  },
  {
    id: "whoa-oasis",
    label: "WHOA OASIS",
    shifts: [
      { name: "Michele", friday: "10 AM – 7 PM", saturday: "10 AM – 7 PM", sunday: "10 AM – 7 PM" },
      { name: "Vee", friday: "10 AM – 6 PM", saturday: "10 AM – 6 PM", sunday: "10 AM – 6 PM" },
      { name: "Kyle (Coastal Hook)", friday: "2 – 10 PM", saturday: "2 – 10 PM", sunday: "2 – 10 PM" },
      { name: "Maggie", friday: "2 – 10 PM", saturday: "2 – 10 PM", sunday: "2 – 10 PM" },
      { name: "Nate", friday: "2 – 10 PM", saturday: "2 – 10 PM", sunday: "2 – 10 PM" },
      { name: "Bryce H", friday: "6 PM – 2 AM", saturday: "6 PM – 2 AM", sunday: "6 PM – 2 AM" },
      // OFF is a real entry, not a blank: a crew member reading their row
      // needs to see the day accounted for, not wonder if it's missing.
      { name: "Charlotte", friday: "8 PM – 4 AM", saturday: "OFF", sunday: "6 PM – 2 AM" },
      { name: "Marc Hazelhoff", friday: "10 PM – 6 AM", saturday: "10 PM – 6 AM", sunday: "8 PM – 4 AM" },
      { name: "Rome", friday: "OFF", saturday: "12 – 6 AM", sunday: "10 PM – 4 AM" },
    ],
    managers: [
      {
        name: "Veronica (Vee) — Operations Manager",
        friday: "10 AM – 6 PM",
        saturday: "10 AM – 6 PM",
        sunday: "10 AM – 6 PM",
      },
      {
        name: "Kyle — Radiant Robes / Manager",
        friday: "5 PM – 1 AM",
        saturday: "5 PM – 1 AM",
        sunday: "5 PM – 1 AM",
      },
    ],
  },
];

export const TEAM_CONTACTS: TeamContact[] = [
  {
    role: "Whoa / Creation Station Operations",
    name: "Wasani",
    contact: "949-690-3690",
  },
  {
    role: "Whoadega / Whoa Oasis Director",
    name: "Nick",
    contact: "704-280-4148",
  },
  {
    role: "Whoadega / Whoa Oasis Director",
    name: "Vee",
    contact: "702-715-8031",
  },
  { role: "WHOA OS Tech Support", name: "Jan", contact: "786-554-5865" },
  { role: "Creation Station Organizers", name: "Sam/Aymé", contact: "N/A" },
  { role: "General Questions", contact: "info@wearewhoa.com" },
];
