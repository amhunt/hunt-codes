import { BackLink } from "ui/BackLink";
import React, { useEffect, useState } from "react";
import cx from "classnames";
import { Link, useNavigate } from "react-router-dom";

import {
  asteroidAnchorId,
  asteroidOutlineId,
  satellitePartAnchorId,
  satellitePartOutlineId,
  type SatellitePart,
} from "./solarAnchorIds";
import { BodyLink } from "./SolarOverlays";
import { hoverState } from "./solarHover";
import { journeyState, startSynthJourney } from "./rocketJourney";
import { ensureAudio } from "./synthAudio";
import useWindowSize from "./useWindowSize";
import ZipVideoPopover from "./ZipVideoPopover";
import { ZIP_BLOG_POST_URL } from "./workLinks";

/**
 * /projects-and-toys: the Sputnik satellite up close. The page IS the 3D
 * scene — the camera swoops in from /home and the satellite's parts fade
 * in as the links (Satellite.tsx): the scroll off its antenna tips is
 * the Zip blog post, the screen on its head the launch reel, the pen
 * under the cone the SVG Studio, the vase on top the print store. The
 * 808 pad floating beside it opens the synth studio (DrumPad).
 *
 * The canvases take no pointer input, so each part gets an invisible
 * overlay here that BodyAnchors glues to its projection every frame
 * (`.satellite-link` starts hidden and fades in once the camera
 * settles). Beyond that: a corner Home link and a one-line caption.
 */

/** The arrival swoop lands at 2s; the caption follows a beat later */
const CAPTION_DELAY_MS = 2400;

const PART_TOOLTIP = {
  scroll: "Zip - Engineering Blog Post",
  screen: "Zip - Internal Brand Launch Video",
  pen: "SVG Studio",
  vase: "3D Print Store",
} as const satisfies Record<SatellitePart, string>;

const partHoverProps = (part: SatellitePart) => ({
  onHover: () => {
    hoverState.satellitePart = part;
  },
  onUnhover: () => {
    if (hoverState.satellitePart === part) hoverState.satellitePart = null;
  },
});

/** One satellite part's overlay — BodyLink with this part's ids and copy
 *  looked up for it */
const PartLink = ({
  part,
  children,
}: {
  part: SatellitePart;
  children: React.ComponentProps<typeof BodyLink>["children"];
}) => (
  <BodyLink
    anchorId={satellitePartAnchorId(part)}
    outlineId={satellitePartOutlineId(part)}
    className="satellite-link"
    label={PART_TOOLTIP[part]}
    {...partHoverProps(part)}
  >
    {children}
  </BodyLink>
);

const ProjectsAndToys = () => {
  const navigate = useNavigate();
  const [videoOpen, setVideoOpen] = useState(false);
  const [captionShown, setCaptionShown] = useState(false);
  // No pad on phones (SolarScene hides the 3D one to match) — the
  // portrait close-up leaves no room beside the head
  const isPhone = useWindowSize() === "sm";

  useEffect(() => {
    const timer = setTimeout(() => setCaptionShown(true), CAPTION_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Navigating away (or opening the video) doesn't fire pointerleave —
  // don't leave a hover glow stuck on
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
        <BackLink className="mt-4" />
      </div>
      <main className={cx("projects-caption", captionShown && "show")}>
        <h1>Projects & toys</h1>
        <p>Things I&rsquo;ve made - some for work, some for fun.</p>
      </main>
      {videoOpen ? (
        // While the reel plays the overlays unmount — BodyAnchors skips
        // absent elements, so nothing hovers over it
        <ZipVideoPopover onClose={() => setVideoOpen(false)} />
      ) : (
        <>
          {/* The scroll (the blog post), floating off the antenna tips */}
          <PartLink part="scroll">
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
              <Link {...props} to="/artifacts">
                {outline}
              </Link>
            )}
          </PartLink>
          {/* The floating 808 pad: warps to /synth. Unlocking the
              AudioContext inside this click is what lets the beat start
              the moment you land. */}
          {!isPhone && (
            <BodyLink
              anchorId={asteroidAnchorId("synthpad")}
              outlineId={asteroidOutlineId("synthpad")}
              className="satellite-link"
              label="Space Synth"
              onHover={() => {
                hoverState.asteroid = "synthpad";
              }}
              onUnhover={() => {
                if (hoverState.asteroid === "synthpad") {
                  hoverState.asteroid = null;
                }
              }}
            >
              {({ outline, ...props }) => (
                <button
                  type="button"
                  onClick={() => {
                    ensureAudio();
                    startSynthJourney();
                    // Flip the URL as the ride boards (shareable,
                    // back-button aborts) rather than after the warp
                    // lands — but only if it actually launched, since
                    // the 3D driver may be dead.
                    if (journeyState.phase !== "idle") {
                      void navigate("/synth");
                    }
                  }}
                  {...props}
                >
                  {outline}
                </button>
              )}
            </BodyLink>
          )}
        </>
      )}
    </>
  );
};

export default ProjectsAndToys;
