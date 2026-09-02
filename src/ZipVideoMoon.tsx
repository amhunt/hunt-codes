import React, { useCallback, useEffect } from "react";

import ZipVideoPopover from "./ZipVideoPopover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { MOON_VIDEO_LINK_ID, MOON_VIDEO_OUTLINE_ID } from "./solarAnchorIds";
import { BodyOutline } from "./SolarOverlays";
import { hoverState } from "./solarHover";

/**
 * The moon as a video link on /about: an invisible overlay that
 * BodyAnchors glues to the moon's projection (same plumbing as the
 * asteroid links), with a tooltip and the shared pulsing hover outline.
 * Clicking it opens the Zip brand-redesign launch reel in a ~80vw popover
 * (ZipVideoPopover, which also puts `video-mode` on <body> to hide
 * everything but the stars); Resume additionally hides its own panel via
 * the lifted `open` state it owns.
 *
 * While the popover is open the overlay itself is unmounted — BodyAnchors
 * skips absent elements, so there's nothing left hovering over the video.
 *
 * The résumé's work-sample card opens the same popover through the lifted
 * `open` state, which is why the popover renders even when the moon link
 * is off (`moonLinkActive`): on phones the moon sits behind the full-bleed
 * panel, so there's no click target, but the video still has to open.
 */
const ZipVideoMoon = ({
  open,
  onOpenChange,
  moonLinkActive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mount the moon's click target (off on phones — see above) */
  moonLinkActive: boolean;
}) => {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Navigating away (or opening the video) doesn't fire pointerleave —
  // don't leave the moon's hover glow stuck on
  useEffect(
    () => () => {
      hoverState.moon = false;
    },
    [],
  );

  if (open) return <ZipVideoPopover onClose={close} />;

  if (!moonLinkActive) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <button
            type="button"
            id={MOON_VIDEO_LINK_ID}
            className="moon-link"
            aria-label="Zip brand redesign launch video"
            onClick={() => {
              hoverState.moon = false;
              onOpenChange(true);
            }}
            onPointerEnter={() => {
              hoverState.moon = true;
            }}
            onPointerLeave={() => {
              hoverState.moon = false;
            }}
          >
            <BodyOutline outlineId={MOON_VIDEO_OUTLINE_ID} />
          </button>
        </TooltipTrigger>
        <TooltipContent updatePositionStrategy="always">
          <p>Zip brand redesign launch video</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ZipVideoMoon;
