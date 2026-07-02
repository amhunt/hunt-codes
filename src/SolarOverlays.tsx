import React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { asteroidAnchorId } from "./space3d/solar/BodyAnchors";

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
