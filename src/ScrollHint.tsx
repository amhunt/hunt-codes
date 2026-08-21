import React, { useEffect, useState } from "react";
import { ChevronDown } from "react-feather";
import cx from "classnames";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TOOLTIP_DELAY_MS,
} from "./ui/tooltip";
import { scrollTransitionState } from "./scrollTransition";

/**
 * Where each stop actually goes, for the tooltip and the screen-reader
 * label. These have to name the real destination — telling someone on
 * /home that the chevron explores the solar system describes the trip
 * they just finished, not the resume they are about to reach.
 */
const DESTINATION_TEXT: Record<1 | 2, string> = {
  1: "Scroll or click around to explore the solar system",
  2: "Scroll on to the resume — or click to travel there",
};

/**
 * The wide-tracked caption above the chevron. Generic on the landing page
 * (the whole solar system is next); on /home it stays short — the tooltip
 * and screen-reader label (DESTINATION_TEXT) name the resume destination.
 */
const CAPTION_TEXT: Record<1 | 2, string> = {
  1: "Scroll or click to explore",
  2: "Scroll on",
};

type ScrollHintProps = {
  /**
   * Journey stop to travel to when the hint is clicked — the next view
   * along (see JOURNEY_STOPS): 1 from the landing page, 2 from home.
   */
  target: 1 | 2;
  /** How long to wait before fading in, after the page's own choreography */
  delayMs: number;
  /** Hide it — the visitor has started scrubbing and no longer needs it */
  hidden?: boolean;
  /**
   * Lift it clear of the bottom-left audio pill on phones. Only pages that
   * render that pill need this — it is gated on `!isLanding`.
   */
  clearsBottomLeftControl?: boolean;
};

/**
 * The bouncing "this page scrolls" nudge, shared by the landing page and
 * home. Both sit on the scroll journey with somewhere further to travel,
 * so both earn the hint; only /about (native scrolling) does not.
 *
 * Clicking it rides the same journey a wheel scrub would rather than
 * hard-navigating — a chevron that merely *hints* at travel would be a
 * broken promise as a <button>.
 */
const ScrollHint = ({
  target,
  delayMs,
  hidden = false,
  clearsBottomLeftControl = false,
}: ScrollHintProps) => {
  const [ready, setReady] = useState(false);
  const [clicked, setClicked] = useState(false);
  const destinationText = DESTINATION_TEXT[target];

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cx(
              "scroll-hint",
              clearsBottomLeftControl && "scroll-hint--above-controls",
              (!ready || hidden || clicked) && "hint-hidden",
            )}
            aria-label={destinationText}
            onClick={() => {
              const s = scrollTransitionState;
              if (s.initialized && s.rigSettled) {
                s.target = target;
                setClicked(true);
              }
            }}
          >
            {/* aria-hidden: the button's own label already says this, and
                more fully — this copy is the visible shorthand */}
            <span className="scroll-hint-label" aria-hidden="true">
              {CAPTION_TEXT[target]}
            </span>
            <ChevronDown className="scroll-hint-chevron" size={30} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{destinationText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ScrollHint;
