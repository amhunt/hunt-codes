import React, { useEffect, useState } from "react";
import cx from "classnames";

import { landingPhraseState, onLandingPhrase } from "./landingPhrase";
import { landingTitleBox } from "./space3d/starSampling";
import useWindowWidth from "./useWindowWidth";

/**
 * The one line of real text on the landing page: a muted, wide-tracked
 * caption hanging under the stacked wordmark on lg+ screens, left-aligned
 * to it. Positioned inline off the title's ink block, so it stays under
 * whichever phrase the stars are spelling — the three-line "BY ANDREW
 * HUNT" pushes it down, and the `top` eases there (App.scss). It fades
 * in with the solar system on the first visit and straight away after.
 * The one-line banner below lg has no room under it, so there it's
 * nothing; the sr-only <h1> already says this for screen readers.
 */
const TAGLINE = "product / frontend engineer · new york";
/** Air between the title's ink and the caption */
const GAP_PX = 44;

const LandingTagline = ({ delayed }: { delayed: boolean }) => {
  const { width, height } = useWindowWidth();
  const [phrase, setPhrase] = useState(landingPhraseState.phrase);
  useEffect(() => onLandingPhrase(setPhrase), []);

  if (!phrase) return null;
  const box = landingTitleBox(phrase, width, height);
  if (!box.stacked) return null;

  return (
    <p
      className={cx("landing-tagline", !delayed && "no-intro-delay")}
      style={{ left: box.left, top: box.bottom + GAP_PX }}
      aria-hidden="true"
    >
      {TAGLINE}
    </p>
  );
};

export default LandingTagline;
