import React from "react";
import { Link } from "react-router-dom";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  asteroidAnchorId,
  asteroidOutlineId,
  EARTH_ABOUT_RING_ID,
} from "./space3d/solar/BodyAnchors";
import { hoverState } from "./solarHover";

/**
 * DOM overlays for the home page's 3D bodies. The canvases never take
 * pointer input, so every clickable body gets an invisible fixed-position
 * element here that BodyAnchors glues to the body's projection each
 * frame. Everything starts `visibility: hidden` (App.scss) and is
 * revealed once positioned.
 */

const ASTEROID_LINKS = [
  {
    name: "recent",
    label: "Recent blog post",
    href: "https://engineering.ziphq.com/material-ui/",
  },
  {
    name: "github",
    label: "GitHub",
    href: "https://www.github.com/amhunt",
  },
  {
    name: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/andrewmhunt/",
  },
];

const SolarOverlays = () => {
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
      {/* Earth is the /about link. The "ABOUT ME" label curving over the top
          is now rendered in WebGL (space3d/solar/AboutRing) around the 3D
          Earth; this element is just the circular hit target (Earth included)
          that BodyAnchors glues to Earth's projection — the canvas itself
          takes no pointer input. */}
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
      />
      {ASTEROID_LINKS.map((link) => (
        <TooltipProvider key={link.name} delayDuration={100}>
          <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
              <a
                id={asteroidAnchorId(link.name)}
                className="asteroid-link"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                onPointerEnter={() => {
                  hoverState.asteroid = link.name;
                }}
                onPointerLeave={() => {
                  if (hoverState.asteroid === link.name) {
                    hoverState.asteroid = null;
                  }
                }}
              >
                {/* Hover outline: the rock's projected silhouette, drawn
                    by Asteroid into these paths (viewBox matches the
                    anchor box; pathLength normalizes the dash pulse) */}
                <svg
                  className="asteroid-outline"
                  viewBox="0 0 100 100"
                  aria-hidden
                >
                  <g id={asteroidOutlineId(link.name)}>
                    <path className="asteroid-outline-base" pathLength={100} />
                    <path className="asteroid-outline-pulse" pathLength={100} />
                  </g>
                </svg>
              </a>
            </TooltipTrigger>
            <TooltipContent updatePositionStrategy="always">
              <p>{link.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </>
  );
};

export default SolarOverlays;
