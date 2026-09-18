import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import cx from "classnames";

import { onLandingPhrase } from "./landingPhrase";
import { landingGlyphBox, starPhrases } from "./space3d/starSampling";
import useWindowWidth from "./useWindowWidth";

/**
 * "(and Claude)", in a script face beside the landing title's byline: it
 * sits to the right of the "HUNT" of "BY ANDREW HUNT", centred on that
 * line's capitals, in the notch the short last line leaves under
 * "ANDREW". It blurs in a beat after the phrase lands (the stars need a
 * couple of seconds to glide onto the new glyphs) and blurs back out the
 * moment the stars leave for the next phrase.
 *
 * Anchored to the phrase's last glyph — the T — so it starts GAP_FS past
 * where that letter's stars end, and sized off the title's font size
 * (the face is measured at a reference size and scaled to
 * CAPTION_WIDTH_FS). Everything scales with the title, so it fits the
 * notch at every viewport: HUNT plus the gap plus the caption comes to
 * ~6.6 font sizes against ANDREW's ~7.4. Phones never spell the phrase
 * (they get the signature A instead), so there is nothing to show there.
 */
const CREDIT_PHRASE = starPhrases[2];
/** The T of HUNT: the phrase's last glyph, and its last line's right edge */
const LAST_INDEX = CREDIT_PHRASE.length - 1;
/** How long after the phrase lands the stars have settled into it */
const FORMED_MS = 2500;
/** Air between the T's glyph box and the caption, in title font sizes */
const GAP_FS = 0.35;
/** The caption's width in title font sizes — as wide as the title's ♥,
 *  which it used to sit under, so the move didn't resize it */
const CAPTION_WIDTH_FS = 1.65;
/** The size the caption is measured at before it's scaled to that width */
const MEASURE_PX = 24;
const CAPTION = "(and Claude)";

const AndClaude = () => {
  const { width, height } = useWindowWidth();
  const [shown, setShown] = useState(false);
  const [fontSize, setFontSize] = useState(MEASURE_PX);
  const measureRef = useRef<HTMLSpanElement>(null);
  const last = landingGlyphBox(CREDIT_PHRASE, LAST_INDEX, width, height);
  const captionWidth = CAPTION_WIDTH_FS * last.fontSize;

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

  // Size the caption off the title: measure the face at MEASURE_PX and
  // scale. Re-measured on resize and again once the webfont has landed
  // (the first measure may be the fallback face).
  useLayoutEffect(() => {
    const measure = () => {
      const measured = measureRef.current?.getBoundingClientRect().width;
      if (measured) setFontSize((MEASURE_PX * captionWidth) / measured);
    };
    measure();
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [captionWidth]);

  // The one-line banner (below the stacked title's breakpoint) runs the
  // full width — there is no "right of HUNT" to sit in
  if (!last.stacked) return null;

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
          left: last.left + last.width + GAP_FS * last.fontSize,
          // The middle of HUNT's capitals; the rule's translateY(-50%)
          // centres the caption on it
          top: (last.top + last.bottom) / 2,
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
