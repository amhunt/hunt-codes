import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useNavigate } from "react-router-dom";

import { scrollTransitionState } from "./scrollTransition";

/** Wheel travel (px) that scrubs one full between-view swoop */
const SCROLL_RANGE_PX = 1100;
/** Touch swipes cover less distance than wheel flicks — amplify them */
const TOUCH_SCROLL_MULTIPLIER = 2;
/** Rough px-per-line for wheel events reported in lines (Firefox) */
const WHEEL_LINE_PX = 16;
/** The journey spans landing (0) → home (1) → about (2) */
const MAX_STOP = 2;
/** Commit the route once the rendered camera is this close to a stop */
const COMMIT_EPSILON = 0.02;
/** Let wheel momentum finish before gently drawing toward a stop */
const SETTLE_IDLE_MS = 220;
const SETTLE_DURATION_MS = 1200;
/** Wheel events closer together than this belong to one gesture (a
 *  trackpad flick keeps reporting momentum for a while after the fingers
 *  lift) — the scroller gate below judges a gesture by where it began */
const WHEEL_GESTURE_GAP_MS = 250;

const ROUTES = ["/", "/home", "/about"];

export type ScrollJourneyOptions = {
  /**
   * The page's own native scroller — the /about resume. With one set,
   * journey input is gated behind it: only a scroll UP that both starts
   * and stays at the scroller's very top scrubs back toward the previous
   * stop (momentum from a flick up to the top does not roll straight on
   * into the journey — a fresh gesture from the top does). Everything
   * else scrolls the content as usual. Once the scrub has left this
   * page's stop the journey owns the wheel, in both directions, until it
   * settles back — a mid-swoop wheel must not also scroll the resume.
   * Only the last stop is gated this way (upward only).
   */
  scroller?: RefObject<HTMLElement | null>;
  /**
   * Stand the gate down — the journey claims nothing while false (the
   * Zip reel playing over the resume). Only meaningful with a scroller.
   */
  enabled?: boolean;
  /**
   * Called every frame while the visitor's scrub has the rendered
   * progress away from this page's stop, and once more when it returns —
   * for page chrome that should recede with the scrub (the resume panel).
   * The glide-in tail of a scroll-committed arrival is not a scrub.
   */
  onScrub?: (progress: number) => void;
};

/**
 * Scroll-scrubbed travel between the site's views (see
 * scrollTransition.ts). Mounted by the landing page (stop 0), home
 * (stop 1) and the /about resume (stop 2 — gated behind the resume's own
 * native scrolling, see ScrollJourneyOptions.scroller).
 * Accumulates wheel/touch deltas into the journey target and commits the
 * matching route when the RENDERED progress reaches a different stop —
 * keyed to the camera, not the wheel, so a fast fling can't navigate
 * while the swoop is still mid-flight (that restarted the transition).
 *
 * Returns whether the visitor has scrubbed away from this page's stop
 * (the landing page hides its scroll hint once they have).
 */
export default function useScrollJourney(
  stop: 0 | 1 | 2,
  { scroller, enabled = true, onScrub }: ScrollJourneyOptions = {},
) {
  const navigate = useNavigate();
  const [engaged, setEngaged] = useState(false);
  // Read through refs so a fresh callback identity or a flipped flag per
  // render doesn't tear the listeners down and back up
  const onScrubRef = useRef(onScrub);
  onScrubRef.current = onScrub;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const s = scrollTransitionState;
    // NOTE: no state reset on mount or unmount — the journey persists
    // across route hops so a continuous scroll rides straight through
    // (CameraRig adopts the view's stop on fresh page loads instead).
    //
    // Seed `committed` with wherever the rendered progress currently sits:
    // on a link navigation the rig teleports progress to this page's stop
    // on its NEXT frame, so at mount the value is still the previous
    // page's. Committing on that stale reading bounced the visitor
    // straight back (the "clicking the sun doesn't navigate" bug whenever
    // the rig missed a beat — a lost WebGL context, a shader recompile).
    // The seed is cleared the moment progress is observed near this
    // page's own stop, after which scrub commits work as before.
    const committed = { current: Math.round(s.progress) as number | null };

    let lastInputAt = performance.now();
    let lastTouchY: number | null = null;
    let settling: { from: number; to: number; startedAt: number } | null = null;
    let expectedTarget = s.target;
    let wasScrubbing = false;

    // The scroller gate (see ScrollJourneyOptions.scroller)
    let lastWheelAt = -Infinity;
    let gestureAtTop = false;
    const atTop = () => (scroller?.current?.scrollTop ?? Infinity) <= 0;
    /** Whether this input belongs to the journey rather than the page's
     *  own scroller. Always, on pages with nothing else to scroll. */
    const claims = (deltaPx: number) => {
      if (!scroller) return true;
      // Before the rig has adopted this stop (a fresh load, while the
      // three.js chunk is still on its way — or never arrives) and while
      // a link swoop owns the camera, the resume scrolls natively; the
      // target comparison below means nothing until then
      if (!s.initialized || !s.rigSettled || !enabledRef.current) return false;
      // Mid-scrub the journey owns the wheel until it settles back
      if (s.target !== stop) return true;
      return deltaPx < 0 && gestureAtTop && atTop();
    };

    const pauseSettling = () => {
      settling = null;
      lastInputAt = performance.now();
    };

    let raf = 0;
    const watchProgress = (now: number) => {
      raf = requestAnimationFrame(watchProgress);
      if (!s.initialized) return;
      // Links/joyrides own the camera while in flight. A clicked scroll
      // hint can also replace the target without producing wheel input.
      if (!s.rigSettled || s.target !== expectedTarget) pauseSettling();
      if (s.rigSettled && lastTouchY === null) {
        if (
          !settling &&
          now - lastInputAt >= SETTLE_IDLE_MS &&
          s.target !== Math.round(s.target)
        ) {
          settling = {
            from: s.target,
            to: Math.round(s.target),
            startedAt: now,
          };
        }
        if (settling) {
          const t = Math.min(
            1,
            (now - settling.startedAt) / SETTLE_DURATION_MS,
          );
          // Smoothstep starts at rest, accelerates, then brakes gently.
          // The camera's existing easing follows this moving target.
          const eased = t * t * (3 - 2 * t);
          s.target = settling.from + (settling.to - settling.from) * eased;
          if (t === 1) {
            s.target = settling.to;
            settling = null;
          }
        }
      }
      expectedTarget = s.target;
      // A scrub is the visitor having pulled the target off this stop —
      // the last 0.02 of a scroll-committed arrival gliding in (target
      // already here) isn't one; a settle back to the stop still reports
      // until the camera actually lands
      const scrubbing =
        Math.abs(s.progress - stop) > 1e-4 &&
        (s.target !== stop || wasScrubbing);
      if (scrubbing || wasScrubbing) onScrubRef.current?.(s.progress);
      wasScrubbing = scrubbing;
      if (Math.abs(s.progress - stop) < 0.25) committed.current = null;
      const near = Math.round(s.progress);
      if (
        !settling &&
        near !== stop &&
        near !== committed.current &&
        Math.abs(s.progress - near) < COMMIT_EPSILON
      ) {
        committed.current = near;
        void navigate(ROUTES[near]);
      }
    };
    raf = requestAnimationFrame(watchProgress);

    const advance = (deltaPx: number) => {
      // A link-triggered swoop owns the camera; don't fight it
      if (!s.initialized || !s.rigSettled) return;
      pauseSettling();
      s.target = Math.min(
        MAX_STOP,
        Math.max(0, s.target + deltaPx / SCROLL_RANGE_PX),
      );
      expectedTarget = s.target;
      if (Math.abs(s.target - stop) > 0.03) setEngaged(true);
    };

    const onWheel = (e: WheelEvent) => {
      const deltaPx = e.deltaMode === 1 ? e.deltaY * WHEEL_LINE_PX : e.deltaY;
      if (scroller) {
        const now = performance.now();
        if (now - lastWheelAt > WHEEL_GESTURE_GAP_MS) gestureAtTop = atTop();
        lastWheelAt = now;
        // Once the browser has latched native scrolling for this stream
        // (an uncancelled first event) the rest of it isn't ours to take
        if (!e.cancelable || !claims(deltaPx)) {
          // Handed to the resume: the rest of this gesture stays native,
          // even if it overshoots back to the top
          gestureAtTop = false;
          return;
        }
        // Ours: keep the resume from scrolling under the swoop
        e.preventDefault();
      }
      advance(deltaPx);
    };
    const onTouchStart = (e: TouchEvent) => {
      pauseSettling();
      lastTouchY = e.touches[0]?.clientY ?? null;
      gestureAtTop = atTop();
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y == null || lastTouchY == null) return;
      const deltaPx = (lastTouchY - y) * TOUCH_SCROLL_MULTIPLIER;
      lastTouchY = y;
      if (scroller && (!e.cancelable || !claims(deltaPx))) {
        gestureAtTop = false;
        return;
      }
      // Nothing (else) scrolls here — claim the gesture so iOS doesn't
      // rubber-band the viewport while scrubbing
      e.preventDefault();
      advance(deltaPx);
    };
    const onTouchEnd = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? null;
      pauseSettling();
    };

    // The wheel listener stays passive where the page has nothing to
    // scroll; behind a scroller it has to be able to cancel native scroll
    window.addEventListener("wheel", onWheel, { passive: !scroller });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [navigate, stop, scroller]);

  return engaged;
}
