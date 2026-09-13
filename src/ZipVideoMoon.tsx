import React, { useCallback, useEffect } from "react";

import ZipVideoPopover from "./ZipVideoPopover";
import { MOON_VIDEO_LINK_ID, MOON_VIDEO_OUTLINE_ID } from "./solarAnchorIds";
import { BodyLink } from "./SolarOverlays";
import { hoverState } from "./solarHover";

/**
 * The moon as a video link on /about: an invisible overlay BodyAnchors
 * glues to the moon's projection (same plumbing as the asteroid links).
 * Clicking opens the Zip launch reel in ZipVideoPopover. While that's
 * open the overlay unmounts — BodyAnchors skips absent elements, so
 * nothing hovers over the video.
 *
 * The résumé's work-sample card opens the same popover through the
 * lifted `open` state, which is why the popover renders even when the
 * moon link is off: on phones the moon sits behind the full-bleed panel,
 * so there's no click target, but the video still has to open.
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
  // don't leave the hover glow stuck on
  useEffect(
    () => () => {
      hoverState.moon = false;
    },
    [],
  );

  if (open) return <ZipVideoPopover onClose={close} />;

  if (!moonLinkActive) return null;

  return (
    <BodyLink
      anchorId={MOON_VIDEO_LINK_ID}
      outlineId={MOON_VIDEO_OUTLINE_ID}
      className="moon-link"
      label="Zip brand redesign launch video"
      onHover={() => {
        hoverState.moon = true;
      }}
      onUnhover={() => {
        hoverState.moon = false;
      }}
    >
      {({ outline, ...props }) => (
        <button
          type="button"
          onClick={() => {
            hoverState.moon = false;
            onOpenChange(true);
          }}
          {...props}
        >
          {outline}
        </button>
      )}
    </BodyLink>
  );
};

export default ZipVideoMoon;
