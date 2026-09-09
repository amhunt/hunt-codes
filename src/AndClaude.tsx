import React, { useEffect, useState } from "react";
import cx from "classnames";

import { onLandingPhrase } from "./landingPhrase";
import { landingTextBottomPx, starPhrases } from "./space3d/starSampling";
import useWindowWidth from "./useWindowWidth";

/**
 * "(and Claude)", in a script face under the landing title while its
 * stars spell "BUILT WITH ♥": it blurs in a beat after the phrase lands
 * (the stars need a couple of seconds to glide onto the new glyphs) and
 * blurs back out the moment the stars leave for the next phrase. Sits
 * just under the title's glyph band, wherever the viewport width puts
 * that. Phones never spell that phrase (starPhrasesSmall), so there is
 * nothing to show there.
 */
const CREDIT_PHRASE = starPhrases[1];
/** How long after the phrase lands the stars have settled into it */
const FORMED_MS = 2500;
const GAP_PX = 12;

const AndClaude = () => {
  const { width } = useWindowWidth();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let timer = 0;
    const off = onLandingPhrase((phrase) => {
      window.clearTimeout(timer);
      if (phrase === CREDIT_PHRASE) {
        timer = window.setTimeout(() => setShown(true), FORMED_MS);
      } else {
        setShown(false);
      }
    });
    return () => {
      window.clearTimeout(timer);
      off();
    };
  }, []);

  return (
    <p
      className={cx("and-claude", shown && "and-claude--shown")}
      style={{ top: landingTextBottomPx(CREDIT_PHRASE, width) + GAP_PX }}
      aria-hidden="true"
    >
      (and Claude)
    </p>
  );
};

export default AndClaude;
