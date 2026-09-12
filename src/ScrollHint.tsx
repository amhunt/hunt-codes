import React, { useEffect, useState } from "react";
import { ChevronDown } from "react-feather";
import cx from "classnames";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { scrollTransitionState } from "./scrollTransition";

/**
 * Where each stop goes, for the tooltip and the screen-reader label. Name
 * the real destination: telling someone on /home that the chevron
 * explores the solar system describes the trip they just finished.
 */
const DESTINATION_TEXT: Record<1 | 2, string> = {
  1: "Scroll or click to explore",
  2: "Scroll on to the resume — or click to travel there",
};

/**
 * The caption above the chevron. The landing runs caption-less (the
 * bounce carries it); /home stays short, since DESTINATION_TEXT already
 * names where it goes.
 */
const CAPTION_TEXT: Record<1 | 2, string | null> = {
  1: null,
  2: "Scroll on",
};

type ScrollHintProps = {
  /** Journey stop to travel to on click (JOURNEY_STOPS): 1 from the
   *  landing, 2 from home. */
  target: 1 | 2;
  /** How long to wait before fading in, after the page's own choreography */
  delayMs: number;
  /** Hide it — the visitor has started scrubbing and no longer needs it */
  hidden?: boolean;
};

/**
 * The bouncing "this page scrolls" nudge, on the landing and home — both
 * sit on the scroll journey with somewhere further to go; /about (native
 * scrolling) doesn't. Clicking rides the same journey a wheel scrub
 * would rather than hard-navigating.
 */
const ScrollHint = ({ target, delayMs, hidden = false }: ScrollHintProps) => {
  const [ready, setReady] = useState(false);
  const [clicked, setClicked] = useState(false);
  const destinationText = DESTINATION_TEXT[target];

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cx(
            "scroll-hint",
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
          {/* The button's own label says this more fully; this is the
              visible shorthand */}
          {CAPTION_TEXT[target] && (
            <span className="scroll-hint-label" aria-hidden="true">
              {CAPTION_TEXT[target]}
            </span>
          )}
          <ChevronDown className="scroll-hint-chevron" size={30} />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{destinationText}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ScrollHint;
