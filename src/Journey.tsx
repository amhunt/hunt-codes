import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftCircleIcon } from "lucide-react";
import cx from "classnames";

import {
  JOURNEY_CHAPTERS,
  JOURNEY_INTRO,
  JOURNEY_OUTRO,
} from "./journeyContent";
import { cruiseState } from "./journeyCruise";

/**
 * The /journey page: Andrew's story as an opening crawl, gliding into
 * a vanishing point while the 3D scene (space3d/solar/JourneyCruise)
 * cruises through open space behind it.
 *
 * The crawl advances on its own at reading pace; wheel, touch drag, or
 * arrow keys scrub it (forward or back), and the scrub speed feeds the
 * flight — push the story hard and the star field kicks toward
 * lightspeed (cruiseState.boost). All the words live in
 * journeyContent.ts; this file only drives the motion.
 *
 * Under prefers-reduced-motion the auto-play stops: the crawl moves
 * only when the visitor scrolls it.
 */

/** Reading-pace auto-advance */
const BASE_SPEED_PX_S = 30;
/** Extra px/s of crawl velocity per px of wheel delta */
const WHEEL_IMPULSE = 5;
const TOUCH_IMPULSE = 9;
const KEY_IMPULSE = 420;
/** Scrub velocity decays toward 0 with this half-life feel (per second) */
const VELOCITY_DECAY = 3.2;
const MAX_VELOCITY = 2600;
/** Scrub speed that reads as "full burn" to the cruise (px/s) */
const FULL_BURN_VELOCITY = 1000;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const Journey = () => {
  const crawlRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const velocity = useRef(0);
  const [ended, setEnded] = useState(false);
  const endedRef = useRef(false);

  // The crawl needs deep space even in day mode (additive streaks on a
  // pink sky read as nothing) — the same forced-night trick as the
  // lightspeed rides, via a body class (App.scss)
  useEffect(() => {
    document.body.classList.add("journey-mode");
    return () => {
      document.body.classList.remove("journey-mode");
      cruiseState.boost = 0;
    };
  }, []);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const el = crawlRef.current;
      if (!el) return;

      // The story is over once the crawl's tail clears the fade; park
      // there (scrubbing back un-parks)
      const limit = el.offsetHeight + window.innerHeight * 0.35;

      velocity.current *= Math.exp(-dt * VELOCITY_DECAY);
      const auto = reduced || endedRef.current ? 0 : BASE_SPEED_PX_S;
      progress.current = Math.min(
        Math.max(progress.current + (auto + velocity.current) * dt, 0),
        limit,
      );
      el.style.transform = `translate3d(-50%, ${-progress.current}px, 0)`;

      // Feed the flight: hard scrubbing (either direction) revs the ship
      cruiseState.boost = Math.min(
        1,
        Math.abs(velocity.current) / FULL_BURN_VELOCITY,
      );

      const atEnd = progress.current >= limit - 1;
      if (atEnd !== endedRef.current) {
        endedRef.current = atEnd;
        setEnded(atEnd);
      }
    };
    raf = requestAnimationFrame(tick);

    const impulse = (amount: number) => {
      velocity.current = Math.min(
        Math.max(velocity.current + amount, -MAX_VELOCITY),
        MAX_VELOCITY,
      );
    };
    const onWheel = (e: WheelEvent) => {
      impulse((e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * WHEEL_IMPULSE);
    };
    let lastTouchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY;
      if (y == null || lastTouchY == null) return;
      // Nothing else scrolls here — claim the gesture (no iOS rubber-band)
      e.preventDefault();
      impulse((lastTouchY - y) * TOUCH_IMPULSE);
      lastTouchY = y;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        impulse(KEY_IMPULSE);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        impulse(-KEY_IMPULSE);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const replay = () => {
    progress.current = 0;
    velocity.current = 0;
    endedRef.current = false;
    setEnded(false);
  };

  return (
    <>
      <div className="homePageBackLink">
        <Link
          className="mt-4 flex items-center gap-1 transition-transform"
          to="/home"
        >
          <ArrowLeftCircleIcon className="starIcon" size={16} />
          <span>Back to orbit</span>
        </Link>
      </div>
      <main className="journey-page" aria-label="Andrew Hunt's journey">
        <div className="journey-tilt">
          <div ref={crawlRef} className="journey-crawl">
            <p className="journey-overline">{JOURNEY_INTRO.overline}</p>
            <h1 className="journey-title">{JOURNEY_INTRO.title}</h1>
            <p className="journey-subtitle">{JOURNEY_INTRO.subtitle}</p>
            {JOURNEY_CHAPTERS.map((chapter) => (
              <section key={chapter.title} className="journey-chapter">
                <p className="journey-era">{chapter.era}</p>
                <h2>{chapter.title}</h2>
                {chapter.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </section>
            ))}
            <section className="journey-chapter journey-end">
              <h2>{JOURNEY_OUTRO.title}</h2>
              <p className="journey-era">{JOURNEY_OUTRO.subtitle}</p>
            </section>
          </div>
        </div>
      </main>
      {/* Post-credits: once the crawl clears the screen */}
      <div className={cx("journey-credits", ended && "shown")}>
        <button type="button" onClick={replay}>
          ↺ Roll it again
        </button>
        <Link to="/about">Read the plain-text version</Link>
        <Link to="/home">Back to orbit</Link>
      </div>
      <div className={cx("journey-hint", ended && "hint-hidden")}>
        scroll to travel faster
      </div>
    </>
  );
};

export default Journey;
