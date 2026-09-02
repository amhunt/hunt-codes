import { useEffect, useState } from "react";
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

const ROUTES = ["/", "/home", "/about"];

/**
 * Scroll-scrubbed travel between the site's views (see
 * scrollTransition.ts). Mounted by the landing page (stop 0) and home
 * page (stop 1) — not /about, whose resume needs native scrolling.
 * Accumulates wheel/touch deltas into the journey target and commits the
 * matching route when the RENDERED progress reaches a different stop —
 * keyed to the camera, not the wheel, so a fast fling can't navigate
 * while the swoop is still mid-flight (that restarted the transition).
 *
 * Returns whether the visitor has scrubbed away from this page's stop
 * (the landing page hides its scroll hint once they have).
 */
export default function useScrollJourney(stop: 0 | 1) {
  const navigate = useNavigate();
  const [engaged, setEngaged] = useState(false);

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
      advance(e.deltaMode === 1 ? e.deltaY * WHEEL_LINE_PX : e.deltaY);
    };
    const onTouchStart = (e: TouchEvent) => {
      pauseSettling();
      lastTouchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y == null || lastTouchY == null) return;
      // Nothing scrolls on these pages — claim the gesture so iOS
      // doesn't rubber-band the viewport while scrubbing
      e.preventDefault();
      advance((lastTouchY - y) * TOUCH_SCROLL_MULTIPLIER);
      lastTouchY = y;
    };
    const onTouchEnd = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? null;
      pauseSettling();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
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
  }, [navigate, stop]);

  return engaged;
}
