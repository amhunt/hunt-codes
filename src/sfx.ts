import { audioOutput, ensureAudioContext } from "./audioContext";
import { audioPrefs } from "./audioPrefs";

/**
 * The site's interaction sounds — the dive through the sun, the coin's
 * chime, the view switch's sweep. All synthesised through Web Audio
 * rather than loaded as files: the site already carries 6 MB of music in
 * `public/`, and these are a few oscillators and a noise burst apiece, so
 * they cost nothing to ship and can be tuned by ear in the source.
 *
 * Every sound is a one-shot built fresh and left to finish on its own —
 * nothing here holds a node past its tail, so a sound started by a click
 * keeps playing across the route change that click caused (which is the
 * whole point of the ENTER dive).
 *
 * All of it is gated on `audioPrefs.enabled`, the space-jam switch, and
 * on a live AudioContext — every entry point below is called from inside
 * a click, which is what the autoplay policy wants.
 */

/** One bus for the whole layer, so the SFX sit under the music rather
 *  than over it. Peaks in the individual envelopes stay under 1. */
const SFX_BUS_GAIN = 0.4;

let bus: GainNode | null = null;
let noise: AudioBuffer | null = null;
/** Last start time per sound, to swallow double-fires from a frantic
 *  clicker — two identical bursts a few ms apart just sound like a glitch. */
const lastPlayed: Record<string, number> = {};
const MIN_GAP_SECONDS = 0.08;

/** The shared bus, or null when audio is off or unavailable. Also the
 *  one place the mute is enforced, so no caller can forget it. */
function sfxBus(key: string): GainNode | null {
  if (!audioPrefs.enabled) return null;
  const ctx = ensureAudioContext();
  const out = audioOutput();
  if (!ctx || !out) return null;
  if (!bus || bus.context !== ctx) {
    bus = ctx.createGain();
    bus.gain.value = SFX_BUS_GAIN;
    // The master, not the destination, so clicks duck and fade with
    // everything else when the visitor's attention moves
    bus.connect(out);
  }
  const now = ctx.currentTime;
  if (now - (lastPlayed[key] ?? -Infinity) < MIN_GAP_SECONDS) return null;
  lastPlayed[key] = now;
  return bus;
}

/** Two seconds of white noise, reused by every sound that needs air.
 *  Takes the bus's own `BaseAudioContext` — all it needs is a buffer. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/**
 * A band of noise whose centre frequency slides from `from` to `to` —
 * the backbone of both the dive and the view sweep. Gain envelopes are
 * exponential ramps, which can't reach zero, hence the 0.0001 floors.
 */
function sweptNoise(
  bus: GainNode,
  at: number,
  { from, to, q, peak, attack, duration }: SweptNoise,
): void {
  const ctx = bus.context;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = q;
  band.frequency.setValueAtTime(from, at);
  band.frequency.exponentialRampToValueAtTime(to, at + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  source.connect(band);
  band.connect(gain);
  gain.connect(bus);
  source.start(at);
  source.stop(at + duration + 0.05);
}

interface SweptNoise {
  from: number;
  to: number;
  q: number;
  peak: number;
  attack: number;
  duration: number;
}

/** One struck bell: a sine plus a slightly sharp partial, which is what
 *  keeps it from reading as a plain beep. */
function bell(bus: GainNode, freq: number, at: number, duration: number): void {
  const ctx = bus.context;
  [
    [1, 0.3],
    [2.01, 0.09],
  ].forEach(([ratio, peak]) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  });
}

/**
 * Clicking the sun on the landing page: the camera dives from the
 * top-down view into /home, and this rides it down — a band of air
 * climbing, a tone rising under it, and a soft sub landing where the
 * camera settles. It outlives the route change on purpose.
 */
export function playEnter(): void {
  const bus = sfxBus("enter");
  if (!bus) return;
  const ctx = bus.context;
  const t = ctx.currentTime;
  const DURATION = 1.15;

  // The rush of the dive. Levels through here sit about 6dB under where
  // they started — the riser was loud enough to be the thing you noticed
  // about the transition rather than something under it.
  sweptNoise(bus, t, {
    from: 220,
    to: 4200,
    q: 1.2,
    peak: 0.16,
    attack: DURATION * 0.75,
    duration: DURATION,
  });

  // A tone swelling with it, an octave and a half up over the fall
  const tone = ctx.createOscillator();
  tone.type = "triangle";
  tone.frequency.setValueAtTime(110, t);
  tone.frequency.exponentialRampToValueAtTime(330, t + DURATION * 0.8);
  const toneGain = ctx.createGain();
  toneGain.gain.setValueAtTime(0.0001, t);
  toneGain.gain.exponentialRampToValueAtTime(0.11, t + DURATION * 0.7);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, t + DURATION);
  tone.connect(toneGain);
  toneGain.connect(bus);
  tone.start(t);
  tone.stop(t + DURATION + 0.05);

  // Arrival: a sub that drops as the camera settles over /home
  const land = t + DURATION * 0.72;
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(140, land);
  sub.frequency.exponentialRampToValueAtTime(45, land + 0.5);
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.0001, land);
  subGain.gain.exponentialRampToValueAtTime(0.24, land + 0.03);
  subGain.gain.exponentialRampToValueAtTime(0.0001, land + 0.6);
  sub.connect(subGain);
  subGain.connect(bus);
  sub.start(land);
  sub.stop(land + 0.65);
}

/** A major pentatonic run, which can't land on a sour note however the
 *  volley is timed */
const COIN_NOTES = [587.33, 739.99, 880, 1174.66]; // D5 F#5 A5 D6
const COIN_STEP_SECONDS = 0.07;

/**
 * The corner coin's click, alongside the confetti volley: a quick rising
 * arpeggio, the reward sound the volley was already miming.
 */
export function playCoin(): void {
  const bus = sfxBus("coin");
  if (!bus) return;
  const t = bus.context.currentTime;
  COIN_NOTES.forEach((freq, i) => {
    bell(bus, freq, t + i * COIN_STEP_SECONDS, 0.55 - i * 0.06);
  });
}
