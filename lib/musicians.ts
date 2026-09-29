export interface MusicLink {
  label: string;
  url: string;
}

export interface PastShow {
  /** Venue or festival. */
  name: string;
  /** City and state, or country. Omitted where the name already says it. */
  location?: string;
  /** "2022 - 2026" for a residency or a run of years. */
  years?: string;
}

export interface Musician {
  slug: string;
  name: string;
  subgenre: string;
  tagline: string;
  /** One or two sentences. Used on the roster card and in page metadata,
   *  so it has to stand alone. */
  bio: string;
  /**
   * The long version, one string per paragraph, shown on the artist's
   * own page under the short bio. Optional: a roster entry without one
   * reads exactly as it did before.
   */
  story?: string[];
  /** Short, concrete lines. Shown as a list, not prose. */
  funFacts?: string[];
  pastShows?: PastShow[];
  /** Where a promoter writes to. Shown as a mailto button. */
  bookingEmail?: string;
  /**
   * Photographs, as paths under /public (e.g. "/music/wasani-1.jpg").
   * Optional, and the page simply has no gallery without them, so an
   * artist can go live before their photos are in.
   */
  photos?: string[];
  accent: string;
  gradient: [string, string, string];
  rotate: number;
  patternSeed: number;
  links: MusicLink[];
}

export const MUSICIANS: Musician[] = [
  {
    slug: "wasani",
    name: "WASANI",
    subgenre: "Hip-Hop/R&B Vocalist & EDM DJ",
    tagline:
      "Conscious hip-hop and jungle bass, carrying a message of self-love, freedom of expression and positivity.",
    bio: "WASANI is a hip-hop and R&B vocalist and EDM DJ from San Diego, and the founder of WHOA. Live shows fuse classic hip-hop lyricism with wild jungle bass and tribal dancing energy.",
    story: [
      "Fueled by a passion for conscious hip-hop, I began writing and recording my own original lyrics when I was 14 to share with classmates. By the age of 17, my confidence soared after a few thrilling performances in front of thousands at a local venue. Determined to pursue music full-time I moved to Los Angeles when I was 18. A year later, collaborating with Wiz Khalifa's record label Taylor Gang Entertainment wasn't just a dream come true, it was a major step towards my goal of becoming a professional musician.",
      "My lyrical styles blend early influences of reggae, dancehall, 90's hip hop, and the energy of modern day EDM festivals with the psychedelic, surf and skate, hippie culture of Southern California. My live shows are a fusion of classic hip-hop lyrics, wild jungle bass beats, and tribal dancing energy, all infused with a message of self-love, freedom of expression, and positivity.",
      "Driven by a desire for creative freedom, I launched WE ARE WHOA in 2015. This has allowed me to grow a global audience, with fans in over 50 countries, and remain independent from the control of major record labels.",
    ],
    funFacts: [
      "Accumulated over 1 million views total on YouTube",
      "Opened for Wiz Khalifa, Curren$y, E-40, MGK, Soulja Boy, Waka Flocka, Andre Nickatina, Too $hort and more",
      "Founding CEO & Creative Director of a designer clothing brand that promotes art and music",
      "Sold over 10,000 individually and personally hand-painted articles of clothing",
      "Opened a storefront in San Diego called WHOADEGA featuring 20 local artists and hosting community events",
    ],
    pastShows: [
      { name: "Same Same But Different Music Festival", years: "2022 - 2026" },
      { name: "Bang Bang", location: "San Diego, CA" },
      { name: "Wicked West", location: "San Diego, CA" },
      { name: "The Observatory", location: "Santa Ana, CA" },
      { name: "The Novo", location: "Los Angeles, CA" },
      { name: "Mizata", location: "El Salvador" },
      { name: "Quartyard", location: "San Diego, CA" },
      { name: "House Of Blues", location: "Anaheim, CA" },
    ],
    bookingEmail: "wearewhoa247@gmail.com",
    photos: [
      "/music/wasani-1.jpg",
      "/music/wasani-2.webp",
      "/music/wasani-3.jpg",
      "/music/wasani-4.webp",
      "/music/wasani-5.webp",
      "/music/wasani-6.jpg",
      "/music/wasani-7.webp",
    ],
    accent: "#ff7a00",
    gradient: ["#2a0a05", "#8a2a15", "#ff7a00"],
    rotate: -2,
    patternSeed: 7,
    links: [
      { label: "SoundCloud", url: "https://soundcloud.com/wasani" },
      { label: "Bandcamp", url: "https://wearewhoa.bandcamp.com/" },
      { label: "Shop WHOA", url: "/shop" },
    ],
  },
  {
    slug: "dr-play",
    name: "Dr. Play",
    subgenre: "Genre-less Electronic",
    tagline:
      "Atmospheric melodies and soothing rhythms, balancing serenity and intensity.",
    bio: "Dr. Play is a genre-less artist building immersive electronic sets that move between calm and force, made to be travelled through rather than just heard.",
    story: [
      "Dr. Play is a genre-less artist redefining the boundaries of modern sound. Blending atmospheric melodies with soothing rhythms, Dr. Play crafts immersive sonic experiences that balance serenity & intensity, guiding listeners on journeys of reflection & transformation.",
      "Dr. Play unveils the Alchemy in 2026, an exploration of the fundamental elements: air, earth, water, and fire. Each track is designed to evoke introspection, connection, and growth, turning electronic music into a vessel for discovery. With a sound that defies convention and a vision rooted in unity, Dr. Play continues to push the evolution of sonic storytelling.",
    ],
    photos: ["/music/dr-play-1.png"],
    accent: "#7b2ff7",
    gradient: ["#0d0a2a", "#3a2a7b", "#7b2ff7"],
    rotate: -1,
    patternSeed: 9,
    links: [
      { label: "Spotify", url: "https://open.spotify.com/artist/0CPZBWD9IzdrTTyt921HsG" },
    ],
  },
  {
    slug: "lamel",
    name: "Lamel",
    subgenre: "Hip-Hop / Contemporary R&B",
    tagline:
      "Inglewood-raised rapper and founder of the 99Percenters, writing for himself and for everyone coming up behind him.",
    bio: "Lamel is a rapper from Inglewood, California and the founder of the music collective 99Percenters, pulling from contemporary R&B, pop and a range of hip-hop to build a sound of his own.",
    story: [
      "Inglewood CA native Lamel is a Rapper and Founder of the music collective 99Percenters. He has slowly been making a name for himself in the underground hip hop scene. His creative and unique style gives you an insight on who he is and what he represents. He pulls elements from Contemporary R&B, Pop and a variety of Hip-Hop branches that ultimately makes up his sound. Through his musical ventures, he's gained the opportunity to open up for other musical acts such as Curren$y, Too Short, E-40, Waka Flocka, and Wiz Khalifa. His ability to compose songs has also allowed him to expand his reach and write for other up and coming artist.",
    ],
    photos: ["/music/lamel-1.jpg"],
    accent: "#29e6ff",
    gradient: ["#0a1a2e", "#1a4a6b", "#29e6ff"],
    rotate: 2,
    patternSeed: 8,
    links: [
      { label: "Spotify", url: "https://open.spotify.com/artist/53QkKRpLSsprPcOciMo4Rs" },
      { label: "SoundCloud", url: "https://soundcloud.com/lamel310" },
    ],
  },
];

export function getMusician(slug: string) {
  return MUSICIANS.find((musician) => musician.slug === slug);
}
