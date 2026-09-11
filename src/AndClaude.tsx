import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import cx from "classnames";

import { onLandingPhrase } from "./landingPhrase";
import { landingGlyphBox, starPhrases } from "./space3d/starSampling";
import useWindowWidth from "./useWindowWidth";

/**
 * "(and Claude)", in a script face under the heart of the landing
 * title's "BUILT WITH ♥": it blurs in a beat after the phrase lands (the
 * stars need a couple of seconds to glide onto the new glyphs) and blurs
 * back out the moment the stars leave for the next phrase. Centred under
 * the heart glyph and sized to its width — the face is measured at a
 * reference size and scaled to match — with HEART_GAP_PX of air under
 * the title's glyph band. Phones never spell that phrase
 * (starPhrasesSmall), so there is nothing to show there.
 */
const CREDIT_PHRASE = starPhrases[1];
const HEART_INDEX = CREDIT_PHRASE.indexOf("♥");
/** How long after the phrase lands the stars have settled into it */
const FORMED_MS = 2500;
/** Air between the bottom of the title's glyph band and the caption */
const HEART_GAP_PX = 24;
/** The size the caption is measured at before it's scaled to the heart */
const MEASURE_PX = 24;
const CAPTION = "(and Claude)";

const AndClaude = () => {
  const { width, height } = useWindowWidth();
  const [shown, setShown] = useState(false);
  const [fontSize, setFontSize] = useState(MEASURE_PX);
  const measureRef = useRef<HTMLSpanElement>(null);
  const heart = landingGlyphBox(CREDIT_PHRASE, HEART_INDEX, width, height);

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

  // Size the caption to the heart: measure the face at MEASURE_PX and
  // scale. Re-measured on resize and again once the webfont has landed
  // (the first measure may be the fallback face).
  useLayoutEffect(() => {
    const measure = () => {
      const measured = measureRef.current?.getBoundingClientRect().width;
      if (measured) setFontSize((MEASURE_PX * heart.width) / measured);
    };
    measure();
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [heart.width]);

  return (
    <>
      <span
        ref={measureRef}
        className="and-claude and-claude--measure"
        aria-hidden="true"
      >
        {CAPTION}
      </span>
      <p
        className={cx("and-claude", shown && "and-claude--shown")}
        style={{
          left: heart.left + heart.width / 2,
          top: heart.bottom + HEART_GAP_PX,
          fontSize,
        }}
        aria-hidden="true"
      >
        {CAPTION}
      </p>
    </>
  );
};

export default AndClaude;
