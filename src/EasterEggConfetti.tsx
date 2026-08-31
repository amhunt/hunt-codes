import React, { useMemo } from "react";
import { createPortal } from "react-dom";

// One click of the "Product Easter Eggs" pill = one burst. Portals to
// <body> so the rain covers the whole viewport regardless of the resume
// panel's stacking/overflow; Resume owns the mount/unmount timer.

const EGG_COUNT = 55;

// Spring-basket palette: pastel shell + deeper accent for the decoration
const EGG_PALETTES = [
  { shell: "#f9c9d4", accent: "#e05780" }, // pink
  { shell: "#bde0fe", accent: "#3a86ff" }, // sky
  { shell: "#c8f4de", accent: "#2f9e44" }, // mint
  { shell: "#e5d4ff", accent: "#7048e8" }, // lavender
  { shell: "#fff3b0", accent: "#e8850c" }, // butter
  { shell: "#ffd6ba", accent: "#e8590c" }, // peach
];

const EGG_PATH =
  "M12 1.5C6.6 1.5 2 10.1 2 17.1 2 23.6 6.3 28.5 12 28.5s10-4.9 10-11.4C22 10.1 17.4 1.5 12 1.5Z";

const EggSvg = ({
  shell,
  accent,
  clipId,
  variant,
}: {
  shell: string;
  accent: string;
  clipId: string;
  variant: number;
}) => (
  <svg viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id={clipId}>
        <path d={EGG_PATH} />
      </clipPath>
    </defs>
    <path d={EGG_PATH} fill={shell} />
    <g clipPath={`url(#${clipId})`}>
      {variant === 0 && (
        <>
          <path
            d="M0 11l4-3 4 3 4-3 4 3 4-3 4 3"
            fill="none"
            stroke={accent}
            strokeWidth="2"
          />
          <path
            d="M0 21l4-3 4 3 4-3 4 3 4-3 4 3"
            fill="none"
            stroke={accent}
            strokeWidth="2"
          />
        </>
      )}
      {variant === 1 && (
        <>
          <rect y="8" width="24" height="3" fill={accent} />
          <rect y="15" width="24" height="3" fill={accent} opacity="0.7" />
          <rect y="22" width="24" height="3" fill={accent} />
        </>
      )}
      {variant === 2 && (
        <>
          <circle cx="8" cy="9" r="1.8" fill={accent} />
          <circle cx="16" cy="12" r="1.8" fill={accent} />
          <circle cx="7" cy="17" r="1.8" fill={accent} />
          <circle cx="15" cy="21" r="1.8" fill={accent} />
          <circle cx="10" cy="25" r="1.8" fill={accent} />
        </>
      )}
    </g>
    <ellipse
      cx="8.2"
      cy="8"
      rx="2.2"
      ry="3.2"
      fill="#fff"
      opacity="0.35"
      transform="rotate(-20 8.2 8)"
    />
  </svg>
);

const EasterEggConfetti = () => {
  const eggs = useMemo(
    () =>
      Array.from({ length: EGG_COUNT }, (_, i) => ({
        left: Math.random() * 100,
        size: 18 + Math.random() * 18,
        duration: 2.1 + Math.random() * 1.3,
        delay: Math.random() * 0.6,
        // Sway amplitude in px; the sign randomizes which way the first
        // drift goes so eggs don't zigzag in lockstep
        sway: (Math.random() * 2 - 1) * 40,
        spinDuration: 1.2 + Math.random() * 1.6,
        spinReverse: Math.random() < 0.5,
        // Scatter position for the reduced-motion fade-in-place variant
        topPct: 5 + Math.random() * 80,
        palette: EGG_PALETTES[i % EGG_PALETTES.length],
        variant: i % 3,
      })),
    [],
  );

  return createPortal(
    <div className="easter-egg-confetti" aria-hidden="true">
      {eggs.map((egg, i) => (
        <span
          key={i}
          className="egg-drop"
          style={
            {
              left: `${egg.left}%`,
              width: egg.size,
              animationDuration: `${egg.duration}s`,
              animationDelay: `${egg.delay}s`,
              "--egg-sway": `${egg.sway}px`,
              "--egg-top": `${egg.topPct}%`,
            } as React.CSSProperties
          }
        >
          <span
            className="egg-spin"
            style={{
              animationDuration: `${egg.spinDuration}s`,
              animationDirection: egg.spinReverse ? "reverse" : "normal",
            }}
          >
            <EggSvg
              shell={egg.palette.shell}
              accent={egg.palette.accent}
              clipId={`egg-clip-${i}`}
              variant={egg.variant}
            />
          </span>
        </span>
      ))}
    </div>,
    document.body,
  );
};

export default EasterEggConfetti;
