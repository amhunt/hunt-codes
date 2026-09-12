/**
 * The site's one Web Audio context, shared by the /synth engine
 * (synthAudio.ts), the generative pad (ambientPad.ts) and the interaction
 * sounds (sfx.ts). One rather than one each: browsers cap how many
 * contexts a page may hold, and sharing means a single resume on the
 * first gesture, a single suspend when the tab goes away, and — the point
 * of `audioOutput` below — a single gain to ride when the visitor's
 * attention moves.
 *
 * Autoplay policy hands back a context that starts out "suspended", so
 * `ensureAudioContext` is safe to call from anywhere — it only actually
 * makes sound possible when called from inside a user gesture.
 */

/** Every fade here runs over this long — ducking away, coming back, and
 *  the fade-out that precedes a suspend. */
const FADE_SECONDS = 1;
/**
 * Where the whole layer sits while the visitor is in another application.
 * The page is still on screen, so going silent would be wrong — this is a
 * duck, not a pause, and the site keeps murmuring at the edge of hearing.
 */
const UNFOCUSED_LEVEL = 0.2;

let ctx: AudioContext | null = null;
/** Master gain: everything the site plays passes through it, so
 *  attention changes are one ramp rather than a negotiation with three
 *  separate graphs. */
let output: GainNode | null = null;
/** Whether the tab going away is what suspended us, so coming back only
 *  wakes a context that was actually running before. */
let suspendedByHide = false;
/** Pending "the fade has finished, park the context" callback */
let suspendTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Where the master should sit right now. Hidden beats unfocused: a tab
 * you switched away from is both, and silence is the stronger answer.
 */
function targetLevel(): number {
  if (document.hidden) return 0;
  return document.hasFocus() ? 1 : UNFOCUSED_LEVEL;
}

function rampTo(level: number, seconds: number): void {
  if (!ctx || !output) return;
  const now = ctx.currentTime;
  const { gain } = output;
  // Ramp from wherever the last one got to, rather than snapping back to
  // its endpoint first — attention can change again mid-fade
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(level, now + seconds);
}

function clearSuspendTimer(): void {
  if (suspendTimer === null) return;
  clearTimeout(suspendTimer);
  suspendTimer = null;
}

/**
 * Bring the output in line with where the visitor's attention is.
 *
 * Hidden fades out first and only then suspends, so the tab doesn't cut
 * off mid-note; coming back resumes from actual silence and fades up,
 * rather than reopening at whatever level the fade-out was interrupted
 * at. App.tsx pauses every `<audio>` element on the same event, but that
 * sweep is a `querySelectorAll("audio")` and cannot see a Web Audio
 * graph, which is why the context minds its own visibility.
 */
function applyState(): void {
  if (!ctx || !output) return;

  if (document.hidden) {
    rampTo(0, FADE_SECONDS);
    // Park the context once the fade has actually run out. Suspending
    // immediately would chop the tail; suspending at all is what stops
    // the pad burning a core in a tab nobody is looking at.
    if (suspendTimer === null && ctx.state === "running") {
      suspendTimer = setTimeout(() => {
        suspendTimer = null;
        if (document.hidden && ctx && ctx.state === "running") {
          suspendedByHide = true;
          void ctx.suspend();
        }
      }, FADE_SECONDS * 1000);
    }
    return;
  }

  // Back before the fade finished — the context was never parked, so just
  // turn the ramp around
  clearSuspendTimer();
  const level = targetLevel();

  if (suspendedByHide) {
    suspendedByHide = false;
    // Open from silence: the gain is wherever the fade-out left it, and
    // a suspended context's clock is frozen, so the ramp has to be set up
    // after the resume lands
    output.gain.cancelScheduledValues(ctx.currentTime);
    output.gain.value = 0;
    void ctx.resume().then(() => rampTo(level, FADE_SECONDS));
    return;
  }

  rampTo(level, FADE_SECONDS);
}

function watchAttention(): void {
  // Switching tabs or minimising: the page stops being visible at all
  document.addEventListener("visibilitychange", applyState);
  // Switching applications: the page is still on screen and stays
  // "visible", so only these fire — this is the duck, not the pause
  window.addEventListener("blur", applyState);
  window.addEventListener("focus", applyState);
  // A page can *load* hidden or unfocused — opened in a background tab,
  // restored with the session — and none of the above fires for that, so
  // the starting state has to be applied by hand.
  applyState();
}

/** Create (once) and resume the shared context. Returns null where Web
 *  Audio isn't available at all, so callers can no-op quietly. */
export function ensureAudioContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    output = ctx.createGain();
    output.gain.value = targetLevel();
    output.connect(ctx.destination);
    watchAttention();
  }
  // Don't wake a context for a page nobody is looking at — applyState
  // brings it back when the page returns
  if (ctx.state === "suspended" && !document.hidden) void ctx.resume();
  return ctx;
}

/**
 * The node every other audio module connects to instead of
 * `ctx.destination`. Connecting straight to the destination would opt
 * that sound out of the attention fades above.
 */
export function audioOutput(): GainNode | null {
  ensureAudioContext();
  return output;
}
