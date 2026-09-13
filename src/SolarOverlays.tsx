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

/** Shared tooltip and outline; children supplies the link or button target. */
export const BodyLink = ({
  anchorId,
  outlineId,
  className,
  label,
  onHover,
  onUnhover,
  children,
}: {
  anchorId: string;
  outlineId: string;
  className: string;
  /** Tooltip copy and accessible name */
  label: string;
  onHover: () => void;
  onUnhover: () => void;
  children: (props: {
    id: string;
    className: string;
    "aria-label": string;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    outline: React.ReactNode;
  }) => React.ReactElement;
}) => (
  <Tooltip disableHoverableContent delayDuration={TOOLTIP_BODY_DELAY_MS}>
    <TooltipTrigger asChild>
      {children({
        id: anchorId,
        className,
        "aria-label": label,
        onPointerEnter: onHover,
        onPointerLeave: onUnhover,
        outline: <BodyOutline outlineId={outlineId} />,
      })}
    </TooltipTrigger>
    <TooltipContent updatePositionStrategy="always">
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
);

/** A guarded clear keeps stale pointerleave events from wiping a new hover. */
const asteroidHoverProps = (name: string) => ({
  onHover: () => {
    hoverState.asteroid = name;
  },
  onUnhover: () => {
    if (hoverState.asteroid === name) hoverState.asteroid = null;
  },
});

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
        <BodyLink
          anchorId={asteroidAnchorId("satellite")}
          outlineId={asteroidOutlineId("satellite")}
          className="asteroid-link"
          label="Projects & creations"
          {...asteroidHoverProps("satellite")}
        >
          {({ outline, ...props }) => (
            <Link to="/projects-and-toys" {...props}>
              {outline}
            </Link>
          )}
        </BodyLink>
      )}
      {/* The LinkedIn rock is parked for now (its 3D body is skipped in
          SolarScene to match). Restore both to bring it back:
      {!isNarrow && (
          <BodyLink
            anchorId={asteroidAnchorId("linkedin")}
            outlineId={asteroidOutlineId("linkedin")}
            className="asteroid-link"
            label="LinkedIn"
            {...asteroidHoverProps("linkedin")}
          >
            {({ outline, ...props }) => (
              <a
                href="https://www.linkedin.com/in/andrewmhunt/"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {outline}
              </a>
            )}
          </BodyLink>
      )}
      */}
      {/* The rocket link is parked until the /journey copy is ready (the
          ship itself too — SolarScene). Clicking it boards the ship and
          warps to the /journey crawl, rocketJourney.ts flipping the route
          under the warp flash. Restore this block plus the
          startRocketJourney, journeyState and useNavigate imports.
        <BodyLink
          anchorId={asteroidAnchorId("rocket")}
          outlineId={asteroidOutlineId("rocket")}
          className="asteroid-link"
          label="So u wanna be astronaut?"
          {...asteroidHoverProps("rocket")}
        >
          {({ outline, ...props }) => (
            <button
              type="button"
              onClick={() => {
                startRocketJourney();
                // Fall back to the plain page if the 3D ride cannot start.
                if (journeyState.phase === "idle") {
                  void navigate("/journey");
                }
              }}
              {...props}
            >
              {outline}
            </button>
          )}
        </BodyLink>
      */}
    </>
  );
};

export default SolarOverlays;
