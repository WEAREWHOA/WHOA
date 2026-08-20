export interface StoryChoice {
  label: string;
  next: string;
}

export interface StoryNode {
  title: string;
  body: string;
  choices?: StoryChoice[];
  ending?: "success" | "fail";
}

export const START_NODE = "start";

export const STORY: Record<string, StoryNode> = {
  start: {
    title: "Through the Door",
    body: "You reach for the door marked SAME SAME BUT WHOA. The knob blooms into a kaleidoscope and pulls you through a spinning tunnel of light and sound. You land barefoot and glowing in the WHOA Underland, where the grass hums in your favorite key.",
    choices: [
      { label: "Follow the trail of glitter footprints", next: "caterpillar" },
      { label: "Chase the drifting bassline through the fog", next: "rave" },
    ],
  },
  caterpillar: {
    title: "The Cheshire Caterpillar",
    body: "A Cheshire Caterpillar lounges on a giant mushroom, blowing smoke rings shaped like question marks. “Curiouser,” it purrs, “is the only direction that matters here.”",
    choices: [
      { label: "Step through a smoke ring", next: "smoke_door" },
      { label: "Answer the caterpillar's riddle", next: "riddle" },
    ],
  },
  rave: {
    title: "The Mushroom Rave",
    body: "You follow the bassline into a clearing where mushrooms pulse like speakers and fireflies keep the beat. A figure in a flame-patterned cloak waves you over.",
    choices: [
      { label: "Dance until the mushrooms glow brighter", next: "dance" },
      { label: "Slip past toward a river of liquid neon", next: "river" },
    ],
  },
  smoke_door: {
    title: "The Hall of Maybes",
    body: "The smoke ring hardens into a doorway. On the other side: a hall of mirrors, each one reflecting a different version of you — braver, weirder, more you.",
    choices: [
      { label: "Pick the mirror that winks first", next: "mirror_win" },
      { label: "Smash every mirror at once", next: "mirror_fail" },
    ],
  },
  riddle: {
    title: "The Riddle",
    body: "“What grows more colorful the more you give it away?” the caterpillar asks, exhaling a heart-shaped cloud.",
    choices: [
      { label: "Answer: “Love”", next: "riddle_win" },
      { label: "Answer: “Money”", next: "riddle_fail" },
    ],
  },
  dance: {
    title: "The Glow-Up",
    body: "You dance until the whole clearing lights up like a rainbow heartbeat. The cloaked figure lowers their hood — a friendly flame spirit, absolutely delighted.",
    choices: [
      { label: "Ask the flame spirit for a way home", next: "flame_win" },
      { label: "Keep dancing forever", next: "flame_loop" },
    ],
  },
  river: {
    title: "The Neon River",
    body: "The river of liquid neon hums your name as it drifts by. Wade in, and it might carry you somewhere incredible — or somewhere very, very wet.",
    choices: [
      { label: "Wade in and trust the current", next: "river_win" },
      { label: "Turn back toward the rave", next: "river_fail" },
    ],
  },

  mirror_win: {
    title: "You Found Yourself",
    body: "The winking mirror pulls you through, and on the other side stands the most-you version of you yet — grinning, glowing, holding a door shaped like a flamingo. It swings open onto the WHOADEGA.",
    ending: "success",
  },
  mirror_fail: {
    title: "Shattered, Not Stirred",
    body: "Every mirror explodes into a thousand giggling shards that spiral you gently back to where you started. No harm done — Underland glass is famously forgiving.",
    ending: "fail",
  },
  riddle_win: {
    title: "Curiouser and Curiouser",
    body: "“Correct,” the caterpillar beams, and the heart-shaped cloud bursts into confetti. A trail of petals leads you straight to the WHOADEGA's back door.",
    ending: "success",
  },
  riddle_fail: {
    title: "Wrong Currency",
    body: "The caterpillar sighs a smoke ring shaped like a shrug. “Wrong current-cy,” it says, and gently blows you back to the start of the trail.",
    ending: "fail",
  },
  flame_win: {
    title: "Lit (In a Good Way)",
    body: "The flame spirit hands you a lantern that burns in seven colors at once. “Follow this,” they say, “it knows the way to the WHOADEGA.”",
    ending: "success",
  },
  flame_loop: {
    title: "One More Song",
    body: "You dance until the sun and moon both come up to watch. Eventually you wake up back at the door marked SAME SAME BUT WHOA, out of breath and grinning.",
    ending: "fail",
  },
  river_win: {
    title: "Carried Home",
    body: "The current wraps around you like a warm, glowing hug and sets you down gently on the WHOADEGA's front step, humming a tune you swear you already know.",
    ending: "success",
  },
  river_fail: {
    title: "Back to the Beat",
    body: "You turn back toward the rave, where the flame-cloaked figure just shrugs and hands you a glow stick. Not every path leads forward — some just loop.",
    ending: "fail",
  },
};
