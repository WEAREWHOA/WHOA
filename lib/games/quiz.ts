export interface QuizResult {
  id: string;
  title: string;
  tagline: string;
  description: string;
  accent: string;
  emoji: string;
}

export const QUIZ_RESULTS: QuizResult[] = [
  {
    id: "one-of-one",
    title: "The 1-of-1 Painted Piece",
    tagline: "There's only one of you, and everyone knows it.",
    description:
      "You don't follow the drop, you are the drop. Bold, hand-done, impossible to replicate.",
    accent: "#ff2fb0",
    emoji: "🎨",
  },
  {
    id: "flame-tee",
    title: "The Flame Tee",
    tagline: "Simple, loud, always in the mix.",
    description:
      "You don't overthink it — you show up, bring the energy, and somehow end up everywhere.",
    accent: "#ff7a00",
    emoji: "🔥",
  },
  {
    id: "upcycled-jacket",
    title: "The Upcycled Jacket",
    tagline: "Reworked, layered, and better for it.",
    description: "You take what's around you and turn it into something nobody's seen before.",
    accent: "#7b2ff7",
    emoji: "🧵",
  },
  {
    id: "sticker-chaos",
    title: "Sticker Pack Chaos",
    tagline: "A little bit of everything, all at once.",
    description: "Small, everywhere, impossible to pin down. You're the wildcard of the group.",
    accent: "#29e6ff",
    emoji: "✨",
  },
  {
    id: "quiet-print",
    title: "The Quiet Print",
    tagline: "Understated, but everyone remembers it.",
    description: "You let the work speak. No noise needed — people notice anyway.",
    accent: "#baff29",
    emoji: "🖼️",
  },
];

export interface QuizOption {
  label: string;
  resultId: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "arrival",
    prompt: "You just walked into the WHOA Oasis. What are you doing first?",
    options: [
      { label: "Making a beeline for whatever looks handmade", resultId: "upcycled-jacket" },
      { label: "Striking up a conversation with a stranger", resultId: "flame-tee" },
      { label: "Grabbing every sticker within reach", resultId: "sticker-chaos" },
      { label: "Standing back and taking it all in", resultId: "quiet-print" },
    ],
  },
  {
    id: "energy",
    prompt: "Pick your festival energy.",
    options: [
      { label: "Loud, bright, impossible to miss", resultId: "flame-tee" },
      { label: "Chaotic good — a little bit of everything", resultId: "sticker-chaos" },
      { label: "One statement piece, done right", resultId: "one-of-one" },
      { label: "Calm, observant, quietly magnetic", resultId: "quiet-print" },
    ],
  },
  {
    id: "creation",
    prompt: "You're at the Creation Station. What do you make?",
    options: [
      { label: "Something nobody else could ever recreate", resultId: "one-of-one" },
      { label: "A patchwork of everything you found lying around", resultId: "upcycled-jacket" },
      { label: "A dozen small things instead of one big one", resultId: "sticker-chaos" },
      { label: "One clean, simple idea, executed well", resultId: "quiet-print" },
    ],
  },
  {
    id: "compliment",
    prompt: "Someone compliments your fit. What do they say?",
    options: [
      { label: "\"Wait, is that one-of-a-kind?\"", resultId: "one-of-one" },
      { label: "\"That's such a you piece.\"", resultId: "flame-tee" },
      { label: "\"Where did you even find that?\"", resultId: "upcycled-jacket" },
      { label: "\"I didn't notice it at first, but now I can't stop.\"", resultId: "quiet-print" },
    ],
  },
  {
    id: "friday-night",
    prompt: "It's Friday night at the booth. Where are you?",
    options: [
      { label: "Front and center, talking to everyone", resultId: "flame-tee" },
      { label: "Bouncing between every corner of the space", resultId: "sticker-chaos" },
      { label: "Helping someone else finish their piece", resultId: "upcycled-jacket" },
      { label: "Off to the side, quietly making something", resultId: "quiet-print" },
    ],
  },
  {
    id: "leave-behind",
    prompt: "What do you want people to remember about you?",
    options: [
      { label: "That there was genuinely nobody else like me", resultId: "one-of-one" },
      { label: "That I made the night more fun", resultId: "flame-tee" },
      { label: "That I turned nothing into something", resultId: "upcycled-jacket" },
      { label: "That I was everywhere, somehow", resultId: "sticker-chaos" },
    ],
  },
];

export function computeQuizResult(resultIds: string[]): QuizResult {
  const counts = new Map<string, number>();
  for (const id of resultIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  let winnerId = resultIds[0];
  let winnerCount = 0;
  for (const [id, count] of counts) {
    if (count > winnerCount) {
      winnerId = id;
      winnerCount = count;
    }
  }

  return QUIZ_RESULTS.find((r) => r.id === winnerId) ?? QUIZ_RESULTS[0];
}
