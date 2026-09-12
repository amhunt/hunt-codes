import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { SunInternals } from "SunSvg";
import { hoverState } from "./solarHover";
import { playEnter } from "./sfx";
import useScrollJourney from "./useScrollJourney";
import ScrollHint from "./ScrollHint";
import AndClaude from "./AndClaude";
import LandingTagline from "./LandingTagline";
import {
  SUN_CENTER,
  SUN_RADIUS_OFFSET,
  SUN_SIZE,
  SUN_SURFACE_RADIUS,
} from "./landingScene";
import { ringLabelMetrics } from "./ringLabel";
import { JOURNEY_STOPS } from "./scrollTransition";
import { LANDING_STACK_MIN_WIDTH_PX } from "./space3d/starSampling";
import useWindowWidth from "./useWindowWidth";

// While the landing page is up, the coin's hit target takes its lg+ dock
// position from App.scss `body.on-landing` rules
const LANDING_BODY_CLASS = "on-landing";

// The solar system's 4s-delayed fadeIn is first-visit choreography (the
// stars assemble first). Landing remounts on every visit, and replaying
// that delay when returning from /home would hide the whole system — and
// the sun flying back into it — for 5 seconds.
let hasPlayedIntro = false;

// The sun's hit target, in viewBox units. It reaches past the disc to the
// outer edge of the curved ENTER label the WebGL sun draws around it, so the
// word is part of the link rather than decoration sitting next to it — the
// same radius the label is laid out on (ringLabel.ts), read in the SVG's
// units, where the sun's radius is SUN_SURFACE_RADIUS.
const SUN_HIT_RADIUS = ringLabelMetrics(SUN_SURFACE_RADIUS).outerRadius;

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

  useEffect(() => {
    document.body.classList.add(LANDING_BODY_CLASS);
    return () => document.body.classList.remove(LANDING_BODY_CLASS);
  }, []);

  // lg+ stacks the title in a left column with the sun off to the right
  // (starSampling / CameraRig); ENTER is the only call to action there,
  // so the scroll chevron sits that layout out
  const { width } = useWindowWidth();
  const stacked = width >= LANDING_STACK_MIN_WIDTH_PX;

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
            // The dive sound outlives this page — sfx.ts holds no node
            // past its tail, so the riser keeps falling through the route
            // change and lands about where the camera settles over /home
            onClick={playEnter}
          >
            {/* The "ENTER" label itself is drawn by the WebGL sun; this SVG
                supplies the clickable disc the label rings — sized to take
                the label in too, since SunInternals' own paths stop just
                past the limb */}
            <circle
              cx={SUN_CENTER}
              cy={SUN_CENTER}
              r={SUN_HIT_RADIUS}
              fill="transparent"
            />
            <SunInternals size={SUN_SIZE} radiusOffset={SUN_RADIUS_OFFSET} />
          </Link>
        </svg>
      </div>
      {/* "(and Claude)" under the title while the stars spell BUILT WITH ♥ */}
      <AndClaude />
      {/* The line under the stacked wordmark (lg+ only) */}
      <LandingTagline delayed={!skipIntroDelay} />
      {/* Gentle nudge that the page scrolls; disappears once it has done
          its job (the visitor scrubs) */}
      {!stacked && (
        <ScrollHint
          target={JOURNEY_STOPS.home}
          delayMs={
            skipIntroDelay ? HINT_DELAY_RETURN_MS : HINT_DELAY_FIRST_VISIT_MS
          }
          hidden={engaged}
        />
      )}
    </>
  );
};

export default Landing;
