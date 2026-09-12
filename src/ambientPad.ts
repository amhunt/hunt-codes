import { ensureAudioContext } from "./audioContext";

/**
 * The site's background music: a generative drone that the solar scene
 * plays, rather than a track on a loop. Four voices hold a chord, each a
 * pair of oscillators a few cents apart; the chord changes with the view,
 * a lowpass opens as the camera closes on the sun, and planets crossing
 * in front of one another ping a note over the top. Nothing repeats,
 * because nothing is a recording.
 *
 * Three-free and page-agnostic, the way synthAudio.ts is: this module
 * only knows about sound. `solar/AmbientPadDriver` is the half that knows
 * about the scene, and it calls the setters below each frame.
 *
 * Gated on the space-jam switch, which owns `audioPrefs.enabled` and
 * calls `setPadEnabled`. Sound needs a resumed AudioContext, which needs
 * a user gesture, so a pad switched on before the visitor has touched
 * anything waits for the first interaction (`armGestureUnlock`).
 */

/** MIDI note numbers. Each view gets a chord from one mode, so moving
 *  through the site modulates rather than lurching key to key. */
const CHORDS: Record<string, number[] | null> = {
  // Dm9, wide and unresolved — nothing has happened yet
  landing: [38, 45, 53, 64],
  // F major: warmer, you've arrived
  home: [41, 48, 57, 64],
  // Bb maj7, low and reflective, for reading the résumé over
  about: [34, 41, 50, 57],
  // Gm, out at the moon
  artifacts: [43, 50, 58, 65],
  // C, the brightest of them — the toy box
  projects: [36, 43, 52, 59],
  // Both of these carry their own audio (the synth engine, the ship's
  // soundtrack), so the pad stands down rather than playing under them
  synth: null,
  journey: null,
};

const VOICES = 4;
/** Spread between each voice's oscillator pair — enough to shimmer,
 *  short of sounding out of tune */
const DETUNE_CENTS = 6;
const OSC_GAIN = 0.09;
const PAD_BUS_GAIN = 0.28;
/** Ambient means slow: the pad breathes in and out over seconds */
const FADE_SECONDS = 3;
/** Chord changes glide rather than cut, over about the length of the
 *  camera's swoop between views (CameraRig's TRANSITION_SECONDS) */
const GLIDE_SECONDS = 2;
const CUTOFF_MIN_HZ = 320;
const CUTOFF_MAX_HZ = 2600;

const midiToFreq = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

interface Voice {
  oscillators: OscillatorNode[];
  gain: GainNode;
}

interface Pad {
  ctx: AudioContext;
  bus: GainNode;
  filter: BiquadFilterNode;
  voices: Voice[];
}

let pad: Pad | null = null;
let enabled = false;
let scene = "landing";
let unlockArmed = false;

/**
 * Build the graph and start every oscillator. They run for the life of
 * the page — starting and stopping oscillators per chord would click, and
 * eight idling oscillators behind a closed gain cost nothing.
 *
 * Built whatever state the context is in. A suspended context accepts
 * nodes and `start()` calls perfectly happily and simply begins when it
 * resumes, so the pad is standing by before the visitor's first gesture
 * rather than being assembled by it. Waiting for "running" here would
 * cost a second gesture: `resume()` is async, so the state is still
 * "suspended" on the very tick the first one unlocks it.
 */
function build(): Pad | null {
  const ctx = ensureAudioContext();
  if (!ctx) return null;

  const bus = ctx.createGain();
  bus.gain.value = 0.0001;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  filter.Q.value = 1.4;
  filter.connect(bus);
  bus.connect(ctx.destination);

  // Slow drift on the cutoff, so the pad moves even when the scene is
  // still — the same trick as the synth's "gravity wobble"
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 110;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  const chord = CHORDS[scene] ?? CHORDS.landing!;
  const voices: Voice[] = [];
  for (let i = 0; i < VOICES; i += 1) {
    const gain = ctx.createGain();
    gain.gain.value = OSC_GAIN;
    gain.connect(filter);
    const freq = midiToFreq(chord[i % chord.length]);
    const oscillators = [-DETUNE_CENTS, DETUNE_CENTS].map((cents) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(gain);
      osc.start();
      return osc;
    });
    voices.push({ oscillators, gain });
  }

  return { ctx, bus, filter, voices };
}

/** Ramp the pad's own gain. Exponential ramps can't reach zero, hence
 *  the floor — inaudible, and it keeps the ramp well-defined. */
function fadeTo(level: number): void {
  if (!pad) return;
  const { ctx, bus } = pad;
  const now = ctx.currentTime;
  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), now);
  bus.gain.exponentialRampToValueAtTime(
    Math.max(level, 0.0001),
    now + FADE_SECONDS,
  );
}

/** Autoplay policy only lets a context resume from inside a gesture, so
 *  wait out the first interaction and resume there. */
function armGestureUnlock(): void {
  if (unlockArmed) return;
  unlockArmed = true;
  const unlock = () => {
    unlockArmed = false;
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
    if (enabled) ensureAudioContext();
  };
  document.addEventListener("pointerdown", unlock);
  document.addEventListener("keydown", unlock);
}

function start(): void {
  if (!pad) pad = build();
  // No Web Audio at all — nothing to do, and nothing a gesture would fix
  if (!pad) return;
  if (pad.ctx.state !== "running") armGestureUnlock();
  fadeTo(CHORDS[scene] ? PAD_BUS_GAIN : 0);
}

/** The space-jam switch's flip. */
export function setPadEnabled(on: boolean): void {
  enabled = on;
  if (on) start();
  else fadeTo(0);
}

/** Glide the chord to whichever one this view holds. Views with their own
 *  audio (`null` above) fade the pad out instead and back in on the way
 *  out of them. */
export function setPadScene(next: string): void {
  if (next === scene) return;
  scene = next;
  if (!pad || !enabled) return;
  const chord = CHORDS[scene];
  if (!chord) {
    fadeTo(0);
    return;
  }
  const now = pad.ctx.currentTime;
  pad.voices.forEach((voice, i) => {
    const freq = midiToFreq(chord[i % chord.length]);
    voice.oscillators.forEach((osc) => {
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(osc.frequency.value, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + GLIDE_SECONDS);
    });
  });
  fadeTo(PAD_BUS_GAIN);
}

/**
 * How open the pad sounds, 0 (dark) to 1 (bright) — the driver maps the
 * camera's distance from the sun onto this, so closing on the sun opens
 * the filter. Called every frame, so it eases rather than jumps, and
 * writes nothing when the value hasn't meaningfully moved.
 */
let brightness = -1;
export function setPadBrightness(value: number): void {
  if (!pad) return;
  const next = Math.min(1, Math.max(0, value));
  if (Math.abs(next - brightness) < 0.004) return;
  brightness = next;
  pad.filter.frequency.setTargetAtTime(
    CUTOFF_MIN_HZ * (CUTOFF_MAX_HZ / CUTOFF_MIN_HZ) ** next,
    pad.ctx.currentTime,
    0.4,
  );
}

/**
 * Shortest gap between two pings. The six planet pairs cross about every
 * 15 seconds between them, and two pairs can line up on the same frame —
 * which stacks into a clang rather than reading as one bell. This keeps
 * them sparse and strictly one at a time; a ping dropped here is one the
 * ear would not have heard as separate anyway.
 */
const MIN_PING_GAP_SECONDS = 10;
let lastPing = -Infinity;

/**
 * A note over the top, struck when the scene does something worth
 * marking — the driver fires one on each planetary conjunction. Pitched
 * out of the chord currently sounding, two octaves up, so it can't land
 * anywhere sour however the orbits happen to line up.
 */
export function padPing(index: number): void {
  if (!pad || !enabled) return;
  const chord = CHORDS[scene];
  if (!chord) return;
  const { ctx, bus } = pad;
  const at = ctx.currentTime;
  if (at - lastPing < MIN_PING_GAP_SECONDS) return;
  lastPing = at;
  const freq = midiToFreq(chord[index % chord.length] + 24);
  [
    [1, 0.16],
    [2.01, 0.05],
  ].forEach(([ratio, peak]) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 3.5);
    osc.connect(gain);
    // Past the pad's own filter: the ping should ring out clearly rather
    // than be swallowed by whatever the cutoff is doing
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + 3.6);
  });
}
