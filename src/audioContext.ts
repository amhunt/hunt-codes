/**
 * The site's one Web Audio context, shared by the /synth engine
 * (synthAudio.ts) and the interaction sounds (sfx.ts). One rather than one
 * each: browsers cap how many contexts a page may hold, and sharing means
 * a single resume on the first gesture and a single suspend when the tab
 * goes away.
 *
 * Autoplay policy hands back a context that starts out "suspended", so
 * this is safe to call from anywhere — it only actually makes sound
 * possible when called from inside a user gesture, which every caller
 * here is (a click on the sun, the coin, a switch, a synth key).
 */

let ctx: AudioContext | null = null;
/** Whether the tab going away is what suspended us, so coming back only
 *  resumes a context that was actually running before. */
let suspendedByHide = false;

/**
 * App.tsx pauses every `<audio>` element when the tab hides, but that
 * sweep is a `querySelectorAll("audio")` and cannot see a Web Audio
 * graph — an ambient pad or a long tail would otherwise keep sounding in
 * a background tab. So the context minds its own visibility.
 */
function watchVisibility(audio: AudioContext): void {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (audio.state === "running") {
        suspendedByHide = true;
        void audio.suspend();
      }
    } else if (suspendedByHide) {
      suspendedByHide = false;
      void audio.resume();
    }
  });
}

/** Create (once) and resume the shared context. Returns null where Web
 *  Audio isn't available at all, so callers can no-op quietly. */
export function ensureAudioContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    watchVisibility(ctx);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
