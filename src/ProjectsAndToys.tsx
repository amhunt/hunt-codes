import React, { useEffect, useState } from "react";
import cx from "classnames";
import { Link } from "react-router-dom";
import { ArrowLeftCircleIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  satellitePartAnchorId,
  satellitePartOutlineId,
  type SatellitePart,
} from "./solarAnchorIds";
import { BodyOutline } from "./SolarOverlays";
import { hoverState } from "./solarHover";
import ZipVideoPopover from "./ZipVideoPopover";
import { ZIP_BLOG_POST_URL } from "./workLinks";

/**
 * /projects-and-toys: the Sputnik satellite up close. The page IS the 3D
 * scene — the camera swoops in from /home (CameraRig's satellite perch)
 * and the satellite's parts fade in as the links (Satellite.tsx): the
 * antenna cone opens the Zip blog post, the screen on its head plays the
 * Zip launch reel, the graffiti heart is the SVG Studio and the cargo
 * crate is the shop. The canvases take no pointer input, so each part
 * gets an invisible fixed overlay here that BodyAnchors glues to its
 * projection every frame, with the same pulsing silhouette outline the
 * other link bodies use (`.satellite-link` in App.scss starts hidden and
 * fades in once the camera settles). Beyond that: a corner Home link and
 * a one-line caption.
 */

/** The arrival swoop lands at 2s; the caption follows a beat later */
const CAPTION_DELAY_MS = 2400;

const PART_TOOLTIP = {
  antenna: "Zip blog post",
  screen: "Zip launch video",
  heart: "SVG Studio",
  crate: "Artifacts",
} as const satisfies Record<SatellitePart, string>;

const partHoverProps = (part: SatellitePart) => ({
  onPointerEnter: () => {
    hoverState.satellitePart = part;
  },
  onPointerLeave: () => {
    if (hoverState.satellitePart === part) hoverState.satellitePart = null;
  },
});

/** One part's overlay: the tooltip-wrapped hit target (whatever element
 *  the link needs) around the shared outline */
const PartLink = ({
  part,
  children,
}: {
  part: SatellitePart;
  children: (props: {
    id: string;
    className: string;
    "aria-label": string;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    outline: React.ReactNode;
  }) => React.ReactElement;
}) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        {children({
          id: satellitePartAnchorId(part),
          className: "satellite-link",
          "aria-label": PART_TOOLTIP[part],
          ...partHoverProps(part),
          outline: <BodyOutline outlineId={satellitePartOutlineId(part)} />,
        })}
      </TooltipTrigger>
      <TooltipContent updatePositionStrategy="always">
        <p>{PART_TOOLTIP[part]}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const ProjectsAndToys = () => {
  const [videoOpen, setVideoOpen] = useState(false);
  const [captionShown, setCaptionShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCaptionShown(true), CAPTION_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Navigating away (or opening the video) doesn't fire pointerleave —
  // don't leave a part's hover glow stuck on
  useEffect(
    () => () => {
      hoverState.satellitePart = null;
    },
    [],
  );

  return (
    <>
      <div className="homePageBackLink">
        <Link className="mt-4 flex items-center gap-1" to="/home">
          <ArrowLeftCircleIcon
            aria-hidden="true"
            className="starIcon"
            size={16}
          />
          <span>Home</span>
        </Link>
      </div>
      <main className={cx("projects-caption", captionShown && "show")}>
        <h1>projects &amp; toys</h1>
        <p>things I&rsquo;ve made — poke the satellite.</p>
      </main>
      {videoOpen ? (
        // While the reel plays the overlays are unmounted — BodyAnchors
        // skips absent elements, so nothing is left hovering over it
        <ZipVideoPopover onClose={() => setVideoOpen(false)} />
      ) : (
        <>
          {/* Antenna first, the head parts after it: the cone's circle is
              the biggest, so DOM order lets the small targets win where
              they overlap */}
          <PartLink part="antenna">
            {({ outline, ...props }) => (
              <a
                {...props}
                href={ZIP_BLOG_POST_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {outline}
              </a>
            )}
          </PartLink>
          <PartLink part="screen">
            {({ outline, ...props }) => (
              <button
                {...props}
                type="button"
                onClick={() => {
                  hoverState.satellitePart = null;
                  setVideoOpen(true);
                }}
              >
                {outline}
              </button>
            )}
          </PartLink>
          <PartLink part="heart">
            {({ outline, ...props }) => (
              <Link {...props} to="/draw">
                {outline}
              </Link>
            )}
          </PartLink>
          <PartLink part="crate">
            {({ outline, ...props }) => (
              <Link {...props} to="/shop">
                {outline}
              </Link>
            )}
          </PartLink>
        </>
      )}
    </>
  );
};

export default ProjectsAndToys;
