export type PadSound =
  | { kind: "kick" }
  | { kind: "snare" }
  | { kind: "hihat"; open?: boolean }
  | { kind: "clap" }
  | { kind: "tom"; freq: number }
  | { kind: "tone"; freq: number; type: OscillatorType };

export interface Pad {
  id: string;
  label: string;
  accent: string;
  sound: PadSound;
}

// No real WHOA-branded audio assets exist yet, so every pad is a
// synthesized hit via Web Audio rather than a sample — real recordings
// can replace playSound()'s synthesis with buffer playback later without
// changing this pad layout.
export const PADS: Pad[] = [
  { id: "kick", label: "Kick", accent: "#ff2f1a", sound: { kind: "kick" } },
  { id: "snare", label: "Snare", accent: "#ff7a00", sound: { kind: "snare" } },
  { id: "hihat", label: "Hi-hat", accent: "#ffb800", sound: { kind: "hihat" } },
  { id: "open-hat", label: "Open Hat", accent: "#fff229", sound: { kind: "hihat", open: true } },
  { id: "clap", label: "Clap", accent: "#baff29", sound: { kind: "clap" } },
  { id: "tom-low", label: "Tom Lo", accent: "#29e6ff", sound: { kind: "tom", freq: 110 } },
  { id: "tom-mid", label: "Tom Mid", accent: "#29a3ff", sound: { kind: "tom", freq: 165 } },
  { id: "tom-high", label: "Tom Hi", accent: "#7b2ff7", sound: { kind: "tom", freq: 220 } },
  { id: "note-c4", label: "C4", accent: "#ff2fb0", sound: { kind: "tone", freq: 261.6, type: "sine" } },
  { id: "note-d4", label: "D4", accent: "#ff2fb0", sound: { kind: "tone", freq: 293.7, type: "sine" } },
  { id: "note-e4", label: "E4", accent: "#ff2fb0", sound: { kind: "tone", freq: 329.6, type: "sine" } },
  { id: "note-g4", label: "G4", accent: "#ff2fb0", sound: { kind: "tone", freq: 392.0, type: "sine" } },
  { id: "note-a4", label: "A4", accent: "#7b2ff7", sound: { kind: "tone", freq: 440.0, type: "square" } },
  { id: "note-c5", label: "C5", accent: "#7b2ff7", sound: { kind: "tone", freq: 523.3, type: "square" } },
  { id: "note-d5", label: "D5", accent: "#7b2ff7", sound: { kind: "tone", freq: 587.3, type: "square" } },
  { id: "note-e5", label: "E5", accent: "#7b2ff7", sound: { kind: "tone", freq: 659.3, type: "square" } },
];

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function getNoiseBuffer(context: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

function envelope(context: AudioContext, gain: GainNode, attack: number, decay: number, peak = 0.9) {
  const now = context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
}

function playNoise(context: AudioContext, duration: number, highpass?: number) {
  const source = context.createBufferSource();
  source.buffer = getNoiseBuffer(context);
  const gain = context.createGain();

  let node: AudioNode = source;
  if (highpass) {
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highpass;
    source.connect(filter);
    node = filter;
  }
  node.connect(gain);
  gain.connect(context.destination);

  envelope(context, gain, 0.001, duration);
  source.start();
  source.stop(context.currentTime + duration + 0.05);
}

export function playSound(sound: PadSound) {
  const context = getContext();
  if (context.state === "suspended") context.resume();

  switch (sound.kind) {
    case "kick": {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, context.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(context.destination);
      envelope(context, gain, 0.002, 0.3, 1);
      osc.start();
      osc.stop(context.currentTime + 0.35);
      break;
    }
    case "snare": {
      playNoise(context, 0.15, 1000);
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "triangle";
      osc.frequency.value = 180;
      osc.connect(gain);
      gain.connect(context.destination);
      envelope(context, gain, 0.002, 0.12, 0.5);
      osc.start();
      osc.stop(context.currentTime + 0.15);
      break;
    }
    case "hihat":
      playNoise(context, sound.open ? 0.35 : 0.06, 6000);
      break;
    case "clap":
      playNoise(context, 0.2, 1200);
      break;
    case "tom": {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(sound.freq, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(sound.freq * 0.6, context.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(context.destination);
      envelope(context, gain, 0.002, 0.35, 0.8);
      osc.start();
      osc.stop(context.currentTime + 0.4);
      break;
    }
    case "tone": {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = sound.type;
      osc.frequency.value = sound.freq;
      osc.connect(gain);
      gain.connect(context.destination);
      envelope(context, gain, 0.005, 0.4, 0.35);
      osc.start();
      osc.stop(context.currentTime + 0.45);
      break;
    }
  }
}
