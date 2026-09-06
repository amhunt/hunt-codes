import React, { useEffect, useState } from "react";
import cx from "classnames";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftCircleIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  asteroidAnchorId,
  asteroidOutlineId,
  satellitePartAnchorId,
  satellitePartOutlineId,
  type SatellitePart,
} from "./solarAnchorIds";
import { BodyOutline } from "./SolarOverlays";
import { hoverState } from "./solarHover";
import { journeyState, startSynthJourney } from "./rocketJourney";
import { ensureAudio } from "./synthAudio";
import useWindowSize from "./useWindowSize";
import ZipVideoPopover from "./ZipVideoPopover";
import { ZIP_BLOG_POST_URL } from "./workLinks";

/**
 * /projects-and-toys: the Sputnik satellite up close. The page IS the 3D
 * scene — the camera swoops in from /home (CameraRig's satellite perch)
 * and the satellite's parts fade in as the links (Satellite.tsx): the
 * antenna cone opens the Zip blog post, the screen on its head plays the
 * Zip launch reel, the pen floating under the cone is the SVG Studio and
 * the vase standing on top is the 3D print store. The canvases take no
 * pointer input, so each part gets an invisible fixed overlay here that
 * BodyAnchors glues to its projection every frame, with the same pulsing
 * silhouette outline the other link bodies use (`.satellite-link` in
 * App.scss starts hidden and fades in once the camera settles). The 808
 * drum pad floats beside the satellite here too (DrumPad — the door to
 * the synth studio), with the same kind of overlay. Beyond that: a
 * corner Home link and a one-line caption.
 */

/** The arrival swoop lands at 2s; the caption follows a beat later */
const CAPTION_DELAY_MS = 2400;

const PART_TOOLTIP = {
  antenna: "Zip blog post",
  screen: "Zip launch video",
  pen: "SVG Studio",
  vase: "3D Print Store",
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
  const navigate = useNavigate();
  const [videoOpen, setVideoOpen] = useState(false);
  const [captionShown, setCaptionShown] = useState(false);
  // No pad on phones (SolarScene hides the 3D pad to match): the
  // portrait close-up leaves no room beside the head
  const isPhone = useWindowSize() === "sm";

  useEffect(() => {
    const timer = setTimeout(() => setCaptionShown(true), CAPTION_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Navigating away (or opening the video) doesn't fire pointerleave —
  // don't leave a part's (or the pad's) hover glow stuck on
  useEffect(
    () => () => {
      hoverState.satellitePart = null;
      hoverState.asteroid = null;
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
          <PartLink part="pen">
            {({ outline, ...props }) => (
              <Link {...props} to="/draw">
                {outline}
              </Link>
            )}
          </PartLink>
          <PartLink part="vase">
            {({ outline, ...props }) => (
              <Link {...props} to="/shop">
                {outline}
              </Link>
            )}
          </PartLink>
          {/* The floating 808 pad: warps to the synth solar system
              (/synth). Unlocking the AudioContext inside this click is
              what lets the beat start playing the moment you land. */}
          {!isPhone && (
            <TooltipProvider delayDuration={100}>
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    id={asteroidAnchorId("synthpad")}
                    className="satellite-link"
                    aria-label="Space jam studio"
                    onClick={() => {
                      ensureAudio();
                      startSynthJourney();
                      // The studio lives at /synth: flip the URL as the
                      // ride boards (shareable, back-button aborts the
                      // trip) rather than after the warp lands. Only if
                      // the journey actually launched — the 3D driver
                      // may be dead (crashed canvas).
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
      )}
    </>
  );
};

export default ProjectsAndToys;
