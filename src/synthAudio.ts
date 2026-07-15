import type { SynthParam } from "./synthSpec";

/**
 * The space synth's Web Audio engine — a little subtractive poly synth
 * with a built-in arpeggiator, all knobs driven by the planet overlays
 * on /synth. Three-free and page-agnostic: DOM components call the
 * exported controls, the 3D scene only reads `synthState` (pulse level,
 * playing flag) to animate the sun.
 *
 * Graph:  voices (2 detuned oscs + envelope each)
 *           -> voiceBus -> lowpass filter -> master -> destination
 *                          filter -> delay (feedback loop) -> wet -> master
 *         LFO -> filter.frequency ("gravity wobble")
 *
 * The AudioContext is created lazily inside a user gesture
 * (ensureAudio() runs in the 808-pad click handler and in every /synth
 * interaction), so autoplay policy never leaves the synth muted.
 */

/** Read by SynthSystem every frame; pulse spikes on each arp note and
 *  the scene eases the sun's scale toward it. */
export const synthState = {
  ready: false,
  playing: false,
  /** 0..1, set to 1 on each note, decayed by the scene's frame loop */
  pulse: 0,
};

/** Knob values, all normalized 0..1 (defaults = a pleasant patch) */
const params: Record<SynthParam, number> = {
  wave: 2 / 3, // saw
  cutoff: 0.55,
  resonance: 0.25,
  echo: 0.35,
  wobble: 0.12,
  tempo: 0.45,
};

const WAVEFORMS: OscillatorType[] = ["sine", "triangle", "sawtooth", "square"];

let ctx: AudioContext | null = null;
let master: GainNode;
let voiceBus: GainNode;
let filter: BiquadFilterNode;
let delay: DelayNode;
let delayFeedback: GainNode;
let delayWet: GainNode;
let lfo: OscillatorNode;
let lfoGain: GainNode;

const currentWave = (): OscillatorType =>
  WAVEFORMS[Math.round(params.wave * (WAVEFORMS.length - 1))];

const cutoffHz = () => 120 * Math.pow(8000 / 120, params.cutoff);
const arpStepSeconds = () => 60 / (70 + params.tempo * 110) / 2; // 8ths at 70-180 BPM

function applyParam(param: SynthParam): void {
  if (!ctx) return;
  const t = ctx.currentTime;
  switch (param) {
    case "wave":
      break; // picked up by the next note
    case "cutoff":
      filter.frequency.setTargetAtTime(cutoffHz(), t, 0.03);
      break;
    case "resonance":
      filter.Q.setTargetAtTime(0.5 + params.resonance * 14, t, 0.03);
      break;
    case "echo":
      delayWet.gain.setTargetAtTime(params.echo * 0.55, t, 0.03);
      delayFeedback.gain.setTargetAtTime(0.1 + params.echo * 0.55, t, 0.03);
      break;
    case "wobble":
      lfoGain.gain.setTargetAtTime(params.wobble * 2400, t, 0.03);
      lfo.frequency.setTargetAtTime(0.8 + params.wobble * 5, t, 0.03);
      break;
    case "tempo":
      break; // the scheduler reads it per step
  }
}

/** Create/resume the context. Must be called from a user gesture at
 *  least once; safe to call repeatedly. Returns readiness. */
export function ensureAudio(): boolean {
  if (typeof AudioContext === "undefined") return false;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);

    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.connect(master);

    voiceBus = ctx.createGain();
    voiceBus.connect(filter);

    // Space echo: post-filter tap with a feedback loop
    delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.34;
    delayFeedback = ctx.createGain();
    delayWet = ctx.createGain();
    filter.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(master);

    lfo = ctx.createOscillator();
    lfo.type = "triangle";
    lfoGain = ctx.createGain();
    lfoGain.gain.value = 0;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    (Object.keys(params) as SynthParam[]).forEach(applyParam);
    synthState.ready = true;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return true;
}

export function setParam(param: SynthParam, value: number): void {
  params[param] = Math.min(1, Math.max(0, value));
  applyParam(param);
}

export const getParam = (param: SynthParam): number => params[param];

const midiHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// ── Note events ──
// Fired once per audible note — arp steps and keyboard presses alike —
// at the note's audible moment (the arp schedules notes up to ~160ms
// ahead, so emission is deferred to match). The /synth page uses this
// to march the "andrewhunt" letter highlight in time with the music.
type NoteListener = () => void;
const noteListeners = new Set<NoteListener>();

/** Subscribe to every audible note; returns an unsubscribe. */
export function onSynthNote(listener: NoteListener): () => void {
  noteListeners.add(listener);
  return () => {
    noteListeners.delete(listener);
  };
}

function emitNoteAt(when: number): void {
  if (!ctx || noteListeners.size === 0) return;
  const delayMs = Math.max(0, (when - ctx.currentTime) * 1000);
  window.setTimeout(
    () => noteListeners.forEach((listener) => listener()),
    delayMs,
  );
}

/** One synth voice: two slightly-detuned oscillators through an
 *  envelope gain into the shared bus. */
function spawnVoice(midi: number, when: number, velocity: number) {
  if (!ctx) return null;
  emitNoteAt(when);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(velocity, when + 0.015);
  env.connect(voiceBus);
  const oscs = [0, 1].map((i) => {
    const osc = ctx!.createOscillator();
    osc.type = currentWave();
    osc.frequency.setValueAtTime(midiHz(midi), when);
    osc.detune.value = i === 0 ? -6 : 6;
    osc.connect(env);
    osc.start(when);
    return osc;
  });
  return { env, oscs };
}

function releaseVoice(
  voice: { env: GainNode; oscs: OscillatorNode[] },
  when: number,
  releaseSeconds: number,
) {
  voice.env.gain.cancelScheduledValues(when);
  voice.env.gain.setTargetAtTime(0.0001, when, releaseSeconds / 4);
  voice.oscs.forEach((osc) => osc.stop(when + releaseSeconds + 0.1));
}

// ── Keyboard voices ──
const MAX_HELD = 8;
const held = new Map<number, { env: GainNode; oscs: OscillatorNode[] }>();

export function noteOn(midi: number): void {
  if (!ensureAudio() || !ctx || held.has(midi) || held.size >= MAX_HELD) {
    return;
  }
  const voice = spawnVoice(midi, ctx.currentTime, 0.42);
  if (voice) {
    held.set(midi, voice);
    synthState.pulse = 1;
  }
}

export function noteOff(midi: number): void {
  const voice = held.get(midi);
  if (!voice || !ctx) return;
  held.delete(midi);
  releaseVoice(voice, ctx.currentTime, 0.35);
}

// ── Arpeggiator ──
// A spacey A-minor-pentatonic climb; the tempo knob stretches the steps
const ARP_PATTERN = [45, 52, 57, 60, 64, 67, 64, 60, 57, 52, 62, 55];
let arpTimer: number | null = null;
let arpStep = 0;
let nextNoteTime = 0;
const LOOKAHEAD_S = 0.16;
const TICK_MS = 60;

function arpTick() {
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD_S) {
    const midi = ARP_PATTERN[arpStep % ARP_PATTERN.length];
    const step = arpStepSeconds();
    const voice = spawnVoice(midi, nextNoteTime, 0.5);
    if (voice) releaseVoice(voice, nextNoteTime + step * 0.85, 0.3);
    // Close enough to the audible moment (≤ the lookahead) for the sun
    synthState.pulse = 1;
    arpStep++;
    nextNoteTime += step;
  }
  arpTimer = window.setTimeout(arpTick, TICK_MS);
}

export function startArp(): void {
  if (!ensureAudio() || !ctx || synthState.playing) return;
  synthState.playing = true;
  arpStep = 0;
  nextNoteTime = ctx.currentTime + 0.06;
  arpTick();
}

function stopArp(): void {
  synthState.playing = false;
  if (arpTimer !== null) {
    window.clearTimeout(arpTimer);
    arpTimer = null;
  }
}

export const toggleArp = (): void =>
  synthState.playing ? stopArp() : startArp();

/** Leaving /synth: silence everything but keep the context alive so a
 *  return trip picks up instantly. */
export function silenceSynth(): void {
  stopArp();
  if (!ctx) return;
  held.forEach((voice) => releaseVoice(voice, ctx!.currentTime, 0.2));
  held.clear();
}
