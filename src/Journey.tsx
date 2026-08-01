import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftCircleIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import cx from "classnames";

import {
  JOURNEY_CHAPTERS,
  JOURNEY_INTRO,
  JOURNEY_OUTRO,
} from "./journeyContent";
import { cruiseState } from "./journeyCruise";
import { journeyState, requestJourneyLanding } from "./rocketJourney";

/**
 * The /journey page: Andrew's story as a Star Wars-style opening crawl,
 * seen from inside the rocket's cockpit — the 3D scene
 * (space3d/solar/JourneyCruise) flies through the lightspeed streaks
 * behind the text, and the windshield frame (RocketCockpit, revealed by
 * body.rocket-journey) wraps the whole show. Clicking the rocket on
 * /home warps here; deep links board mid-flight.
 *
 * It opens the way the films do: the intro line ("30+ years ago…") fades
 * up flat and centered on the black, holds, and fades out — THEN the
 * steeply-raked crawl begins. Any scrub skips straight into the crawl.
 *
 * The crawl advances on its own at reading pace; wheel, touch drag, or
 * arrow keys scrub it (forward or back), and the scrub feeds the flight
 * two ways: speed revs the star field toward lightspeed
 * (cruiseState.boost), and position places the flyby cameos
 * (cruiseState.progressPx — the 3D objects pass exactly as the story
 * does). All the words live in journeyContent.ts; this file only drives
 * the motion.
 *
 * The cockpit's "End trip" button lands the ride: the 3D loop plays the
 * re-entry flash and drops the ship back onto /home.
 *
 * Under prefers-reduced-motion the intro is skipped and the auto-play
 * stops: the crawl moves only when the visitor scrolls it.
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

/** The soundtrack waits out the boarding flash / intro fade-up */
const SOUNDTRACK_DELAY_MS = 2000;

const Journey = () => {
  const navigate = useNavigate();
  const crawlRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [muted, setMuted] = useState(false);
  const progress = useRef(0);
  const velocity = useRef(0);
  const [ended, setEnded] = useState(false);
  const endedRef = useRef(false);
  // Reduced motion skips the intro sequence and lands straight on the
  // (non-auto-advancing) crawl
  const [reduced] = useState(prefersReducedMotion);
  // The intro line owns the screen first; the crawl holds at the start
  // until it clears (fade-out done, or the visitor scrubs past it)
  const [introDone, setIntroDone] = useState(reduced);
  const introDoneRef = useRef(reduced);

  const finishIntro = () => {
    if (introDoneRef.current) return;
    introDoneRef.current = true;
    setIntroDone(true);
  };

  // The crawl needs deep space even in day mode (additive streaks on a
  // pink sky read as nothing) — the same forced-night trick as the
  // lightspeed rides, via a body class (App.scss)
  useEffect(() => {
    document.body.classList.add("journey-mode");
    return () => {
      document.body.classList.remove("journey-mode");
      cruiseState.boost = 0;
      // Stale crawl coordinates must not place cameos on the next visit
      cruiseState.progressPx = 0;
      cruiseState.totalPx = 0;
    };
  }, []);

  useEffect(() => {
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
      // Hold at the start until the intro clears; then reading-pace
      // auto-advance (off under reduced motion, and once the story ends)
      const auto =
        reduced || endedRef.current || !introDoneRef.current
          ? 0
          : BASE_SPEED_PX_S;
      progress.current = Math.min(
        Math.max(progress.current + (auto + velocity.current) * dt, 0),
        limit,
      );
      el.style.transform = `translate3d(-50%, ${-progress.current}px, 0)`;

      // Feed the flight: hard scrubbing revs the ship, signed so a
      // backwards scrub flies the stars backwards too; the crawl's
      // position places the flyby cameos (JourneyCruise)
      cruiseState.boost = Math.min(
        Math.max(velocity.current / FULL_BURN_VELOCITY, -1),
        1,
      );
      cruiseState.progressPx = progress.current;
      cruiseState.totalPx = limit;

      const atEnd = progress.current >= limit - 1;
      if (atEnd !== endedRef.current) {
        endedRef.current = atEnd;
        setEnded(atEnd);
      }
    };
    raf = requestAnimationFrame(tick);

    const impulse = (amount: number) => {
      // Scrubbing during the intro skips straight into the crawl
      finishIntro();
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
  }, [reduced]);

  // The soundtrack fades up a beat after arrival. Autoplay is allowed
  // when the visitor rode the rocket here (the click was the gesture);
  // on a cold deep link the browser may refuse — the play() rejection is
  // swallowed and the cockpit's volume toggle (a real click) starts it.
  useEffect(() => {
    const timer = setTimeout(() => {
      void audioRef.current?.play().catch(() => {});
    }, SOUNDTRACK_DELAY_MS);
    const audio = audioRef.current;
    return () => {
      clearTimeout(timer);
      audio?.pause();
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    // Unmuting is also the rescue for a blocked autoplay: this click is
    // the user gesture the browser wanted
    const audio = audioRef.current;
    if (!next && audio?.paused) void audio.play().catch(() => {});
  };

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
      {/* Star Wars-style opener: the intro line fades up flat on the
          black, holds, and fades out; when the fade completes the crawl
          takes over (finishIntro also fires early if the visitor scrubs) */}
      {!introDone && (
        <p className="journey-intro" onAnimationEnd={finishIntro}>
          {JOURNEY_INTRO.overline}
        </p>
      )}
      <main className="journey-page" aria-label="Andrew Hunt's journey">
        <div className="journey-tilt">
          <div ref={crawlRef} className="journey-crawl">
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
          ↺ Roll again
        </button>
        <Link to="/about">Back to resume</Link>
      </div>
      <div
        className={cx("journey-hint", (!introDone || ended) && "hint-hidden")}
      >
        scroll to travel faster
      </div>
      {/* The ship's soundtrack: starts on its own shortly after arrival
          (see the effect above), muted via the console toggle */}
      <audio
        ref={audioRef}
        src="/ethereal-funeral-march.mp3"
        loop
        preload="auto"
        muted={muted}
      />
      {/* The dashboard console cluster (App.scss shows it only while
          body.rocket-journey is up — i.e. whenever the 3D ride is
          actually flying; with a dead canvas the plain back link above
          stays instead) */}
      <div className="cockpit-controls">
        <button
          type="button"
          aria-label={muted ? "Unmute the soundtrack" : "Mute the soundtrack"}
          onClick={toggleMute}
        >
          {muted ? <VolumeXIcon size={14} /> : <Volume2Icon size={14} />}
        </button>
        <button
          type="button"
          onClick={() => {
            // The 3D loop plays the landing (flash, drop onto home's
            // approach line, route change); without a ride in flight
            // there's nothing to land — just leave
            if (journeyState.phase !== "idle") {
              requestJourneyLanding();
            } else {
              void navigate("/home");
            }
          }}
        >
          End trip
        </button>
      </div>
    </>
  );
};

export default Journey;
