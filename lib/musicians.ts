export interface MusicLink {
  label: string;
  url: string;
}

export interface Musician {
  slug: string;
  name: string;
  subgenre: string;
  tagline: string;
  bio: string;
  accent: string;
  gradient: [string, string, string];
  rotate: number;
  patternSeed: number;
  links: MusicLink[];
}

export const MUSICIANS: Musician[] = [
  {
    slug: "kaleidosonic",
    name: "Kaleidosonic",
    subgenre: "Bass / Dubstep",
    tagline: "Heavy low-end built for the WHOADEGA speaker stack",
    bio: "Kaleidosonic writes bass music the way Nova Bloom makes collages — layered, glitched, and a little too colorful. Regularly closes out WHOA Wednesday with a set that rattles the merch racks.",
    accent: "#ff2fb0",
    gradient: ["#2a0a3a", "#7b2ff7", "#ff2fb0"],
    rotate: -3,
    patternSeed: 0,
    links: [
      { label: "Spotify", url: "https://open.spotify.com" },
      { label: "SoundCloud", url: "https://soundcloud.com" },
      { label: "Instagram", url: "https://instagram.com" },
    ],
  },
  {
    slug: "velvet-frequency",
    name: "Velvet Frequency",
    subgenre: "Downtempo / Chill",
    tagline: "Warm, slow-motion sets for sunset and afterhours",
    bio: "Velvet Frequency plays the in-between hours — the sunset set, the wind-down after the headliner, the drive home. Expect warm pads, dusty samples, and a groove that never rushes.",
    accent: "#29e6ff",
    gradient: ["#0a2a1f", "#1a6b4a", "#29e6ff"],
    rotate: 2,
    patternSeed: 1,
    links: [
      { label: "Spotify", url: "https://open.spotify.com" },
      { label: "SoundCloud", url: "https://soundcloud.com" },
      { label: "Instagram", url: "https://instagram.com" },
    ],
  },
  {
    slug: "glass-serpent",
    name: "Glass Serpent",
    subgenre: "Psytrance",
    tagline: "High-BPM, full-color, built for sunrise",
    bio: "Glass Serpent builds relentless, hypnotic psytrance for the hours right before sunrise. A regular on the late-night stage at Same Same But Different, known for sets that don't let up.",
    accent: "#baff29",
    gradient: ["#0d3b3b", "#1a8a6b", "#baff29"],
    rotate: -4,
    patternSeed: 2,
    links: [
      { label: "Spotify", url: "https://open.spotify.com" },
      { label: "SoundCloud", url: "https://soundcloud.com" },
      { label: "Instagram", url: "https://instagram.com" },
    ],
  },
  {
    slug: "honeycomb-static",
    name: "Honeycomb Static",
    subgenre: "Future Bass / Melodic",
    tagline: "Sugar-sweet melodies over broken beats",
    bio: "Honeycomb Static writes future bass with pop hooks buried inside — the kind of set that has the whole WHOADEGA singing along by the second drop.",
    accent: "#ff8a29",
    gradient: ["#c97a2f", "#e0a94e", "#ff8a29"],
    rotate: 3,
    patternSeed: 3,
    links: [
      { label: "Spotify", url: "https://open.spotify.com" },
      { label: "SoundCloud", url: "https://soundcloud.com" },
      { label: "Instagram", url: "https://instagram.com" },
    ],
  },
];

export function getMusician(slug: string) {
  return MUSICIANS.find((musician) => musician.slug === slug);
}
