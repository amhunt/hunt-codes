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
  EARTH_ABOUT_RING_ID,
} from "./space3d/solar/BodyAnchors";

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
    name: "old",
    label: "Old personal blog",
    href: "https://andrew-hunt.medium.com/",
  },
];

const SolarOverlays = () => (
  <>
    {/* Earth is the /about link: a ring glued around its projection with
        "About Andrew" curved over the top, styled like the landing
        "enter" ring. The whole circle (Earth included) is clickable. */}
    <Link
      to="/about"
      id={EARTH_ABOUT_RING_ID}
      className="earth-about-ring"
      aria-label="About Andrew"
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <path
          id="earth-about-ring-path"
          fill="none"
          d="
            M 9,50
            a 41,41 0 1,1 82,0
            a 41,41 0 1,1 -82,0
          "
        />
        <text fontFamily="'Inconsolata', monospace" textAnchor="middle">
          <textPath
            href="#earth-about-ring-path"
            startOffset="25%"
            className="svg-link-tspan"
            fontSize="13px"
          >
            About Andrew
          </textPath>
        </text>
      </svg>
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
            />
          </TooltipTrigger>
          <TooltipContent updatePositionStrategy="always">
            <p>{link.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ))}
  </>
);

export default SolarOverlays;
