import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SunInternals } from "SunSvg";
import { hoverState } from "./solarHover";
import { scrollTransitionState } from "./scrollTransition";
import { SUN_RADIUS_OFFSET, SUN_SIZE } from "./landingScene";

// The solar system's 4s-delayed fadeIn is first-visit choreography (the
// stars assemble first). Landing remounts on every visit, and replaying
// that delay when returning from /home would hide the whole system — and
// the sun flying back into it — for 5 seconds.
let hasPlayedIntro = false;

/** Wheel travel (px) that scrubs the full landing→home camera swoop */
const SCROLL_RANGE_PX = 1100;
/** Touch swipes cover less distance than wheel flicks — amplify them */
const TOUCH_SCROLL_MULTIPLIER = 2;
/** Rough px-per-line for wheel events reported in lines (Firefox) */
const WHEEL_LINE_PX = 16;

const Landing = () => {
  const skipIntroDelay = hasPlayedIntro;
  useEffect(() => {
    hasPlayedIntro = true;
  }, []);

  // Clicking ENTER navigates away without a pointerleave — don't leave
  // the sun's hover glow stuck on
  useEffect(
    () => () => {
      hoverState.sun = false;
    },
    [],
  );

  // Scroll-scrubbed entry: the landing page has nothing to scroll, so
  // wheel/touch deltas accumulate into a virtual progress that CameraRig
  // renders as a pose between the landing and home views — stop
  // scrolling and the camera parks mid-swoop; scroll back up and it
  // retreats. Reaching the end commits the navigation to /home (from
  // where the ordinary view transition is a no-op, since the camera is
  // already there).
  const navigate = useNavigate();
  const navigated = useRef(false);
  useEffect(() => {
    scrollTransitionState.target = 0;
    scrollTransitionState.progress = 0;

    const advance = (deltaPx: number) => {
      const s = scrollTransitionState;
      s.target = Math.min(1, Math.max(0, s.target + deltaPx / SCROLL_RANGE_PX));
      if (s.target >= 1 && !navigated.current) {
        navigated.current = true;
        void navigate("/home");
      }
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
      // Nothing scrolls on this page — claim the gesture so iOS doesn't
      // rubber-band the viewport while scrubbing
      e.preventDefault();
      advance((lastTouchY - y) * TOUCH_SCROLL_MULTIPLIER);
      lastTouchY = y;
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      // Leaving the page (scrub completion or the ENTER link): hand the
      // camera back to the timed rig cleanly
      scrollTransitionState.target = 0;
      scrollTransitionState.progress = 0;
    };
  }, [navigate]);

  // The orbits and planets are the WebGL scene's (SolarScene); this SVG
  // only carries the clickable ENTER sun ring, which SunSvgAnchor glues
  // to the projected 3D sun each frame.
  return (
    <div className="landing-page">
      {/* The page's only visible text is drawn in WebGL — give crawlers
          and screen readers something to land on */}
      <h1 className="sr-only">Andrew Hunt — Frontend Engineer in New York</h1>
      <svg
        id="solar-system"
        className={skipIntroDelay ? "no-intro-delay" : undefined}
        viewBox="0 0 600 600"
        style={{ display: "block" }}
      >
        <Link
          to="/home"
          aria-label="Enter Andrew Hunt's home page"
          onPointerEnter={() => {
            hoverState.sun = true;
          }}
          onPointerLeave={() => {
            hoverState.sun = false;
          }}
        >
          {/* The "ENTER" label itself is drawn by the WebGL sun; this SVG
              supplies the clickable disc the label rings */}
          <SunInternals size={SUN_SIZE} radiusOffset={SUN_RADIUS_OFFSET} />
        </Link>
      </svg>
    </div>
  );
};

export default Landing;
