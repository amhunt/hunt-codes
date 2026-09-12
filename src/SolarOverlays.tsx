import React from "react";
import { Link } from "react-router-dom";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TOOLTIP_BODY_DELAY_MS,
} from "./ui/tooltip";
import {
  asteroidAnchorId,
  asteroidOutlineId,
  EARTH_ABOUT_OUTLINE_ID,
  EARTH_ABOUT_RING_ID,
} from "./solarAnchorIds";
import { hoverState } from "./solarHover";
import useWindowSize from "./useWindowSize";

/**
 * DOM overlays for the home page's 3D bodies. The canvases never take
 * pointer input, so every clickable body gets an invisible element here
 * that BodyAnchors glues to its projection each frame. All start
 * `visibility: hidden` (App.scss), revealed once positioned.
 */

/** Hover outline shared by every link body: its projected silhouette,
 *  drawn by the 3D scene into these paths (viewBox matches the anchor
 *  box; pathLength normalizes the dash pulse). */
export const BodyOutline = ({ outlineId }: { outlineId: string }) => (
  <svg className="body-outline" viewBox="0 0 100 100" aria-hidden>
    <g id={outlineId}>
      <path className="body-outline-base" pathLength={100} />
      <path className="body-outline-pulse" pathLength={100} />
    </g>
  </svg>
);

// The blog-post rock ("recent") is parked: the post now lives on /about's
// work-sample cards, and SolarScene skips its 3D rock to match. The
// LinkedIn rock is parked too (see the commented block below).

const SolarOverlays = () => {
  // Below lg the Sputnik satellite sits out — SolarScene hides the 3D
  // body to match (its page stays reachable from /about's work cards)
  const size = useWindowSize();
  const isNarrow = size !== "lg";
  // Navigating away doesn't fire pointerleave — don't leave a hover
  // glow stuck on
  React.useEffect(
    () => () => {
      hoverState.earth = false;
      hoverState.asteroid = null;
    },
    [],
  );

  return (
    <>
      {/* Earth is the /about link. Its "ABOUT ME" label is drawn in WebGL
          (space3d/solar/AboutRing); this is just the circular hit
          target. */}
      <Link
        to="/about"
        id={EARTH_ABOUT_RING_ID}
        className="earth-about-ring"
        aria-label="About Me"
        onPointerEnter={() => {
          hoverState.earth = true;
        }}
        onPointerLeave={() => {
          hoverState.earth = false;
        }}
      >
        <BodyOutline outlineId={EARTH_ABOUT_OUTLINE_ID} />
      </Link>
      {/* Sputnik: the door to /projects-and-toys, where the camera closes
          in and its parts become the links. Same swoop as Earth's. */}
      {!isNarrow && (
        <Tooltip disableHoverableContent delayDuration={TOOLTIP_BODY_DELAY_MS}>
          <TooltipTrigger asChild>
            <Link
              id={asteroidAnchorId("satellite")}
              className="asteroid-link"
              to="/projects-and-toys"
              aria-label="Projects & creations"
              onPointerEnter={() => {
                hoverState.asteroid = "satellite";
              }}
              onPointerLeave={() => {
                if (hoverState.asteroid === "satellite") {
                  hoverState.asteroid = null;
                }
              }}
            >
              <BodyOutline outlineId={asteroidOutlineId("satellite")} />
            </Link>
          </TooltipTrigger>
          <TooltipContent updatePositionStrategy="always">
            <p>Projects &amp; creations</p>
          </TooltipContent>
        </Tooltip>
      )}
      {/* The LinkedIn rock is parked for now (its 3D body is skipped in
          SolarScene to match). Restore both to bring it back:
      {!isNarrow && (
          <Tooltip disableHoverableContent delayDuration={TOOLTIP_BODY_DELAY_MS}>
            <TooltipTrigger asChild>
              <a
                id={asteroidAnchorId("linkedin")}
                className="asteroid-link"
                href="https://www.linkedin.com/in/andrewmhunt/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                onPointerEnter={() => {
                  hoverState.asteroid = "linkedin";
                }}
                onPointerLeave={() => {
                  if (hoverState.asteroid === "linkedin") {
                    hoverState.asteroid = null;
                  }
                }}
              >
                <BodyOutline outlineId={asteroidOutlineId("linkedin")} />
              </a>
            </TooltipTrigger>
            <TooltipContent updatePositionStrategy="always">
              <p>LinkedIn</p>
            </TooltipContent>
          </Tooltip>
      )}
      */}
      {/* The rocket link is parked until the /journey copy is ready (the
          ship itself too — SolarScene). Clicking it boards the ship and
          warps to the /journey crawl, rocketJourney.ts flipping the route
          under the warp flash. Restore this block plus the
          startRocketJourney, journeyState and useNavigate imports.
        <Tooltip disableHoverableContent delayDuration={TOOLTIP_BODY_DELAY_MS}>
          <TooltipTrigger asChild>
            <button
              type="button"
              id={asteroidAnchorId("rocket")}
              className="asteroid-link"
              aria-label="So u wanna be astronaut?"
              onClick={() => {
                startRocketJourney();
                // The ride flips the URL itself under its warp flash; if
                // the 3D driver is dead (crashed canvas) fall through to
                // the plain crawl page so the click still goes somewhere
                if (journeyState.phase === "idle") {
                  void navigate("/journey");
                }
              }}
              onPointerEnter={() => {
                hoverState.asteroid = "rocket";
              }}
              onPointerLeave={() => {
                if (hoverState.asteroid === "rocket") {
                  hoverState.asteroid = null;
                }
              }}
            >
              <BodyOutline outlineId={asteroidOutlineId("rocket")} />
            </button>
          </TooltipTrigger>
          <TooltipContent updatePositionStrategy="always">
            <p>So u wanna be astronaut?</p>
          </TooltipContent>
        </Tooltip>
      */}
    </>
  );
};

export default SolarOverlays;
