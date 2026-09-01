export interface HuntBranch {
  slug: string;
  label: string;
  description: string;
  accent: string;
}

// Six branches of the WHOA System, each a real section of this platform —
// not arbitrary categories invented for the hunt.
export const HUNT_BRANCHES: HuntBranch[] = [
  {
    slug: "shop",
    label: "WHOADEGA",
    description: "Found at the shop table.",
    accent: "#29e6ff",
  },
  {
    slug: "art",
    label: "Art Collective",
    description: "Found near the art wall.",
    accent: "#fff229",
  },
  {
    slug: "music",
    label: "Music Collective",
    description: "Found by the speakers.",
    accent: "#baff29",
  },
  {
    slug: "ambassadors",
    label: "Brand Ambassadors",
    description: "Found with the ambassador crew.",
    accent: "#ff2fb0",
  },
  {
    slug: "ssbd",
    label: "SSBD",
    description: "Found at the Creation Station.",
    accent: "#ff7a00",
  },
  {
    slug: "portal",
    label: "Backend Portal",
    description: "Found at the sign-up table.",
    accent: "#7b2ff7",
  },
];

export const HUNT_STORAGE_KEY = "whoa_hunt_progress";
export const HUNT_REWARD_CODE = "WHOAHUNT2026";
