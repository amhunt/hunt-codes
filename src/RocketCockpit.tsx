import React from "react";

import { JOURNEY_CRAWL_SLOTS, journeyCrawlLineId } from "./rocketJourney";

/**
 * The lightspeed journeys' cockpit dressing: a steel windshield frame
 * whose edges hug the viewport (so warp reads as seen from inside the
 * ship) and the white flash that covers the jumps. Pure DOM/SVG —
 * mounted by every page a journey can start or end on (/home, /synth),
 * revealed by `body.rocket-journey` (App.scss), never takes pointer
 * input.
 *
 * The frame SVG stretches non-uniformly (preserveAspectRatio="none"):
 * corner curves become gentle ellipses on wide screens, which reads as
 * windshield styling rather than distortion. Strokes stay crisp via
 * vector-effect.
 */

// Outer rect minus the rounded windshield opening (evenodd)
const FRAME_PATH =
  "M0 0 H100 V100 H0 Z " +
  "M8 21 Q8 7 20 7 H80 Q92 7 92 21 V70 Q92 86 78 86 H22 Q8 86 8 70 Z";
const OPENING_PATH =
  "M8 21 Q8 7 20 7 H80 Q92 7 92 21 V70 Q92 86 78 86 H22 Q8 86 8 70 Z";

const RocketCockpit = () => (
  <>
    {/* Star-Wars-style crawl: a perspective-tilted plane under the
        windshield frame. The slots are empty shells — RocketJourney's
        frame loop writes each ride's script (journeyState.crawl) into
        them and scrolls them up and away, so the crawl stays in step
        with the warp clock (and pauses with it in background tabs). */}
    <div className="journey-crawl" aria-hidden>
      <div className="journey-crawl-plane">
        {Array.from({ length: JOURNEY_CRAWL_SLOTS }, (_, i) => (
          <p
            key={i}
            id={journeyCrawlLineId(i)}
            className="journey-crawl-line"
          />
        ))}
      </div>
    </div>
    <div id="rocket-cockpit" aria-hidden>
      <svg
        className="cockpit-frame"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="cockpit-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a525c" />
            <stop offset="0.45" stopColor="#2e343c" />
            <stop offset="0.62" stopColor="#232830" />
            <stop offset="1" stopColor="#3a414a" />
          </linearGradient>
        </defs>
        <path d={FRAME_PATH} fill="url(#cockpit-steel)" fillRule="evenodd" />
        {/* Purple gasket around the glass */}
        <path
          d={OPENING_PATH}
          fill="none"
          stroke="#9e80f9"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          opacity="0.85"
        />
        {/* Red trim stripes down the side pillars */}
        <path
          d="M3.5 24 V68"
          stroke="#ff5252"
          strokeWidth="3"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M96.5 24 V68"
          stroke="#ff5252"
          strokeWidth="3"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Rivets — on the side pillars and top rail, clear of both the
            glass opening (x 8..92) and the red trim stripes (y 24..68) */}
        {(
          [
            [4, 14],
            [96, 14],
            [4, 78],
            [96, 78],
            [50, 4],
          ] as const
        ).map(([x, y]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r="0.8"
            fill="#1b1f24"
            stroke="#5a636d"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* Dashboard console */}
        <rect x="0" y="88.5" width="100" height="11.5" fill="#262b32" />
        <path
          d="M0 88.5 H100"
          stroke="#12151a"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx="30" cy="94" r="1.3" fill="#ff5252" />
        <circle cx="34.5" cy="94" r="1.3" fill="#ffce4f" />
        <circle cx="39" cy="94" r="1.3" fill="#9e80f9" />
        <rect
          x="46"
          y="91"
          width="14"
          height="6"
          rx="1"
          fill="#0e1a2a"
          stroke="#9e80f9"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points="47.5,94 50,94 51.5,92 53,96 54.5,94 58.5,94"
          fill="none"
          stroke="#7de37d"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {/* A couple of chunky toggle switches */}
        <rect x="66" y="92" width="1.6" height="4" rx="0.8" fill="#9e80f9" />
        <rect x="70" y="92" width="1.6" height="4" rx="0.8" fill="#ff5252" />
        {/* Faint glass glare */}
        <polygon
          points="16,10 34,10 22,83 13,83"
          fill="#ffffff"
          opacity="0.05"
        />
        <polygon
          points="38,10 44,10 34,83 30,83"
          fill="#ffffff"
          opacity="0.035"
        />
      </svg>
    </div>
    <div id="warp-flash" aria-hidden />
  </>
);

export default RocketCockpit;
