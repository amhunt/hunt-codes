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

const ROUTES = ["/", "/home", "/about"];

/**
 * Scroll-scrubbed travel between the site's views (see
 * scrollTransition.ts). Mounted by the landing page (stop 0) and home
 * page (stop 1) — not /about, whose résumé needs native scrolling.
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
    const committed = { current: null as number | null };

    let raf = 0;
    const watchProgress = () => {
      raf = requestAnimationFrame(watchProgress);
      if (!s.initialized) return;
      const near = Math.round(s.progress);
      if (
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
      s.target = Math.min(
        MAX_STOP,
        Math.max(0, s.target + deltaPx / SCROLL_RANGE_PX),
      );
      if (Math.abs(s.target - stop) > 0.03) setEngaged(true);
    };

    const onWheel = (e: WheelEvent) => {
      advance(e.deltaMode === 1 ? e.deltaY * WHEEL_LINE_PX : e.deltaY);
    };
    let lastTouchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
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

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [navigate, stop]);

  return engaged;
}
