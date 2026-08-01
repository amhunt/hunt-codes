import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { SunInternals } from "SunSvg";
import { hoverState } from "./solarHover";
import useScrollJourney from "./useScrollJourney";
import ScrollHint from "./ScrollHint";
import { SUN_RADIUS_OFFSET, SUN_SIZE } from "./landingScene";
import { JOURNEY_STOPS } from "./scrollTransition";

// The solar system's 4s-delayed fadeIn is first-visit choreography (the
// stars assemble first). Landing remounts on every visit, and replaying
// that delay when returning from /home would hide the whole system — and
// the sun flying back into it — for 5 seconds.
let hasPlayedIntro = false;

// The scroll hint appears a beat after the landing choreography finishes:
// the first visit's intro runs ~5s (stars, then the 4s-delayed system
// fade); return visits skip the delay
const HINT_DELAY_FIRST_VISIT_MS = 7000;
const HINT_DELAY_RETURN_MS = 2500;

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

  // Scroll-scrubbed entry (scrollTransition.ts): wheel/touch progress
  // poses the camera along the landing→home→about journey; `engaged`
  // flips once the visitor starts scrubbing (and hides the hint below)
  const engaged = useScrollJourney(0);

  // The orbits and planets are the WebGL scene's (SolarScene); this SVG
  // only carries the clickable ENTER sun ring, which SunSvgAnchor glues
  // to the projected 3D sun each frame.
  return (
    <>
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
      {/* Gentle nudge that the page scrolls; disappears once it has done
          its job (the visitor scrubs) */}
      <ScrollHint
        target={JOURNEY_STOPS.home}
        delayMs={
          skipIntroDelay ? HINT_DELAY_RETURN_MS : HINT_DELAY_FIRST_VISIT_MS
        }
        hidden={engaged}
      />
    </>
  );
};

export default Landing;
