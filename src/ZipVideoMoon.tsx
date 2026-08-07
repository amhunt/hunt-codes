import React, { useCallback, useEffect } from "react";
import { X } from "react-feather";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  MOON_VIDEO_LINK_ID,
  MOON_VIDEO_OUTLINE_ID,
} from "./solarAnchorIds";
import { BodyOutline } from "./SolarOverlays";
import { hoverState } from "./solarHover";

/**
 * The moon as a video link, on /about and /home: an invisible overlay that
 * BodyAnchors glues to the moon's projection (same plumbing as the
 * asteroid links), with a tooltip and the shared pulsing hover outline.
 * Clicking it opens the Zip brand-redesign launch reel in a ~80vw popover;
 * `video-mode` on <body> hides everything but the stars behind it
 * (App.scss), and Resume additionally hides its own panel via the lifted
 * `open` state. Both routes own that state, so neither can mount this
 * twice — and only one route is mounted at a time anyway.
 *
 * While the popover is open the overlay itself is unmounted — BodyAnchors
 * skips absent elements, so there's nothing left hovering over the video.
 */
const ZipVideoMoon = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("video-mode");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("video-mode");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Navigating away (or opening the video) doesn't fire pointerleave —
  // don't leave the moon's hover glow stuck on
  useEffect(
    () => () => {
      hoverState.moon = false;
    },
    [],
  );

  if (open) {
    return (
      <div className="zip-video-layer" onClick={close}>
        <div className="zip-video-popover" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="zip-video-close"
            aria-label="Close video"
            onClick={close}
          >
            <X size={28} />
          </button>
          {/* The click that opened the popover is the user gesture that
              allows autoplay with sound */}
          <video src="/zip-brand-launch.mp4" controls autoPlay playsInline />
          <p className="zip-video-caption">
            A promo video I made for the UI changes we shipped as part of
            Zip&rsquo;s brand redesign in 2023 — built in After Effects and
            Premiere.
          </p>
        </div>
      </div>
    );
  }

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
