import React from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  asteroidAnchorId,
  asteroidOutlineId,
  EARTH_ABOUT_OUTLINE_ID,
  EARTH_ABOUT_RING_ID,
} from "./space3d/solar/BodyAnchors";
import { hoverState } from "./solarHover";
import {
  journeyState,
  startRocketJourney,
  startSynthJourney,
} from "./rocketJourney";
import { ensureAudio } from "./synthAudio";
import useWindowSize from "./useWindowSize";

/**
 * DOM overlays for the home page's 3D bodies. The canvases never take
 * pointer input, so every clickable body gets an invisible fixed-position
 * element here that BodyAnchors glues to the body's projection each
 * frame. Everything starts `visibility: hidden` (App.scss) and is
 * revealed once positioned.
 */

/** Hover outline shared by every link body (Earth, the moon, asteroids,
 *  satellite): the body's projected silhouette, drawn by the 3D scene into
 *  these paths (viewBox matches the anchor box; pathLength normalizes the
 *  dash pulse). */
export const BodyOutline = ({ outlineId }: { outlineId: string }) => (
  <svg className="body-outline" viewBox="0 0 100 100" aria-hidden>
    <g id={outlineId}>
      <path className="body-outline-base" pathLength={100} />
      <path className="body-outline-pulse" pathLength={100} />
    </g>
  </svg>
);

const ASTEROID_LINKS = [
  {
    name: "recent",
    label: "A blog post I wrote at Zip",
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
  const navigate = useNavigate();
  // The 808 pad sits out on phones (SolarScene hides the 3D pad; this
  // hides its click target so no invisible button floats in the sky)
  const isPhone = useWindowSize() === "sm";
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
      >
        <BodyOutline outlineId={EARTH_ABOUT_OUTLINE_ID} />
      </Link>
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
                <BodyOutline outlineId={asteroidOutlineId(link.name)} />
              </a>
            </TooltipTrigger>
            <TooltipContent updatePositionStrategy="always">
              <p>{link.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {/* The rocket easter egg: not a link — clicking it boards the ship
          and plays the lightspeed joyride (rocketJourney.ts). Same anchor
          plumbing as the asteroid links. */}
      <TooltipProvider delayDuration={100}>
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <button
              type="button"
              id={asteroidAnchorId("rocket")}
              className="asteroid-link"
              aria-label="So u wanna be astronaut?"
              onClick={() => startRocketJourney()}
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
      </TooltipProvider>
      {/* The floating 808 pad: warps to the synth solar system (/synth).
          Unlocking the AudioContext inside this click is what lets the
          beat start playing the moment you land. */}
      {!isPhone && (
        <TooltipProvider delayDuration={100}>
          <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
              <button
                type="button"
                id={asteroidAnchorId("synthpad")}
                className="asteroid-link"
                aria-label="Space jam studio"
                onClick={() => {
                  ensureAudio();
                  startSynthJourney();
                  // The studio lives at /synth: flip the URL as the ride
                  // boards (shareable, back-button aborts the trip) rather
                  // than after the warp lands. Only if the journey actually
                  // launched — the 3D driver may be dead (crashed canvas).
                  if (journeyState.phase !== "idle") {
                    void navigate("/synth");
                  }
                }}
                onPointerEnter={() => {
                  hoverState.asteroid = "synthpad";
                }}
                onPointerLeave={() => {
                  if (hoverState.asteroid === "synthpad") {
                    hoverState.asteroid = null;
                  }
                }}
              >
                <BodyOutline outlineId={asteroidOutlineId("synthpad")} />
              </button>
            </TooltipTrigger>
            <TooltipContent updatePositionStrategy="always">
              <p>Space jam studio</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
};

export default SolarOverlays;
