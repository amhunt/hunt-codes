import React, { useEffect, useMemo, useRef, useState } from "react";
import cx from "classnames";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

/** Decimal year, so era widths are plain subtraction */
const ym = (year: number, month: number) => year + (month - 1) / 12;

/** What the tooltip shows — an era, or the future tail */
type Blurb = {
  /** The only thing that goes in the bar itself */
  title: string;
  /** School or employer, shown next to the title in the tooltip */
  org?: string;
  /** Tooltip pill; matches the résumé's location pills */
  location?: string;
  /** Quoted exactly as the résumé states it — years, no invented precision */
  dates: string;
  blurb: string;
};

type Era = Blurb & {
  /** Segment fill. Life eras share a color; work walks up the purple ramp */
  color: string;
  start: number;
  /** Left off for the era still running — it grows to today on its own */
  end?: number;
  /**
   * Childhood only: 18 years would swallow the bar, so it runs off the
   * left edge of the screen and fades instead of starting somewhere
   */
  openStart?: boolean;
};

// Month boundaries are approximate where the résumé only gives a year —
// they set the segment widths, never the dates on screen. The tooltip
// prints `dates`, which matches the résumé exactly.
const eras: Era[] = [
  {
    title: "Child",
    location: "Oregon",
    dates: "1995 – 2013",
    blurb:
      "Grew up in Oregon. This bar runs off the left edge of the screen — 18 years don't fit.",
    color: "#1d7f79",
    start: ym(1995, 1),
    end: ym(2013, 9),
    openStart: true,
  },
  {
    title: "College",
    org: "Princeton University",
    location: "New Jersey",
    dates: "September 2013 – June 2017",
    blurb:
      "BSE in Computer Science — plus a summer interning on Airbnb's frontend in 2016.",
    color: "#2f5fd0",
    start: ym(2013, 9),
    end: ym(2017, 7),
  },
  {
    title: "Engineer",
    org: "Airbnb",
    location: "San Francisco",
    dates: "2017 – 2020",
    blurb:
      "Pricing and availability across Experiences, 20+ A/B tests, and the org's migration to TypeScript.",
    color: "#5b3ec4",
    start: ym(2017, 7),
    end: ym(2020, 7),
  },
  {
    title: "Engineer",
    org: "Untapped (fka Jumpstart)",
    location: "San Francisco",
    dates: "2020 – 2021",
    blurb:
      "Launched the Recruiter Analytics platform and led the frontend platform group.",
    color: "#7a4fd0",
    start: ym(2020, 7),
    end: ym(2021, 7),
  },
  {
    title: "Staff Engineer",
    org: "Zip",
    location: "San Francisco",
    dates: "2021 – 2025",
    blurb:
      "Four years on the procurement platform: shared components, CI and DevX, build and deploy, 99% type safety.",
    color: "#4a2f9e",
    start: ym(2021, 7),
    end: ym(2025, 2),
  },
  {
    title: "Sabbatical + Contract Work",
    org: "Argos",
    location: "San Francisco + Remote",
    dates: "2025 – Present",
    blurb:
      "A few months of recharging after Zip, then easing back in through independent consulting — shipping production frontend for Argos, a legal-tech AI product.",
    color: "#8659e0",
    start: ym(2025, 2),
  },
];

/**
 * The open slot after today: no duration, so no place in the time math —
 * it's a fixed-width tail (see --life-future-w) that fades out to the
 * right the way childhood fades in on the left.
 */
const future: Blurb = {
  title: "future",
  dates: "Fall 2026 – ?",
  blurb:
    "Looking to go full-time again this fall. If you're building something good, say hi: andrew@hunt.codes",
};

/**
 * Where the visible bar starts. Everything before it is off-screen inside
 * the childhood segment, which is the point: at true scale childhood is
 * over half a life so far, and the interesting part is the right end.
 */
const VISIBLE_START = ym(2010, 7);

/**
 * Inconsolata's advance is half its size, so an 11px label is ~5.6px a
 * character; add the segment's own padding. A segment narrower than its
 * label renders bare and lets the color and the tooltip do the talking.
 */
const LABEL_PX_PER_CHAR = 5.6;
const LABEL_PADDING_PX = 16;
/**
 * Labels may break onto two lines (the bar is tall enough for exactly
 * two), so the gate is the longer half of the best two-line split rather
 * than the whole title
 */
const twoLineChars = (title: string) => {
  const words = title.split(" ");
  let longest = title.length;
  for (let i = 1; i < words.length; i++) {
    const head = words.slice(0, i).join(" ").length;
    const tail = words.slice(i).join(" ").length;
    longest = Math.min(longest, Math.max(head, tail));
  }
  return longest;
};
/** A year tick needs room for four digits and its rule */
const MIN_YEAR_PX = 42;
/** The childhood segment fades over its left half (see .life-seg--open) */
const OPEN_START_LABEL_FRACTION = 0.5;

// The geometry never changes after load (the running era ends at this
// month), so it's laid out once: each era's share of the track and the
// narrowest segment its label fits in. Only the fits-or-not booleans
// depend on the live bar width.
const now = new Date();
const today = ym(now.getFullYear(), now.getMonth() + 1);
const span = today - VISIBLE_START;
const layout = eras.map((era) => ({
  era,
  width:
    (((era.end ?? today) - Math.max(era.start, VISIBLE_START)) / span) * 100,
  labelMinPx:
    (twoLineChars(era.title) * LABEL_PX_PER_CHAR + LABEL_PADDING_PX) /
    (era.openStart ? OPEN_START_LABEL_FRACTION : 1),
  year: Math.floor(era.start),
  key: `${era.title}-${era.dates}`,
}));

const FUTURE_KEY = "future";

const ariaLabel = ({ title, org, dates }: Blurb) =>
  [title, org, dates].filter(Boolean).join(", ");

const LifeTimeline = ({
  visible,
  ref,
}: {
  visible: boolean;
  /** The bar's root — Resume fades it along with the panel while the
   *  visitor scrubs the camera back toward /home */
  ref?: React.Ref<HTMLDivElement>;
}) => {
  // Widths are percentages, so the pixel width of the track is the only
  // thing that decides whether a label fits. Watched rather than read on
  // render: the bar spans the viewport and resizes without a re-render.
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(([entry]) => {
      setTrackWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const segments = useMemo(
    () =>
      layout.map((cell) => {
        const px = (trackWidth * cell.width) / 100;
        return {
          ...cell,
          showLabel: px >= cell.labelMinPx,
          showYear: px >= MIN_YEAR_PX,
        };
      }),
    [trackWidth],
  );

  // Tooltips are controlled so a tap opens them: Radix only opens on
  // hover and on keyboard focus, which leaves phones with no way in.
  // Tap-to-toggle needs to know whether the tooltip was already open when
  // the pointer went down, because Radix closes it on pointerdown before
  // click ever fires.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const wasOpen = useRef(false);

  /** One segment: a tooltip-triggering button plus its card */
  const segment = (
    key: string,
    info: Blurb,
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
    children: React.ReactNode,
  ) => (
    <Tooltip
      key={key}
      open={openKey === key}
      onOpenChange={(open) => setOpenKey(open ? key : null)}
    >
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel(info)}
          onPointerDown={() => {
            wasOpen.current = openKey === key;
          }}
          onClick={() => setOpenKey(wasOpen.current ? null : key)}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={10}
        collisionPadding={12}
        // Strip the shared tooltip chrome (dark chip, tight padding,
        // clipped overflow) — the card below brings its own
        className="overflow-visible bg-transparent p-0"
      >
        <div className="life-tip-card">
          <div className="life-tip-head">
            <span className="life-tip-title">
              {info.title}
              {info.org && <span className="life-tip-org"> · {info.org}</span>}
            </span>
            {info.location && (
              <span className="pill location-pill">{info.location}</span>
            )}
          </div>
          <div className="life-tip-dates">{info.dates}</div>
          <p className="life-tip-blurb">{info.blurb}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div
      ref={ref}
      className={cx("life-timeline", !visible && "life-timeline--hidden")}
      role="group"
      aria-label="Timeline of my life"
    >
      {/* Short delay: sweeping the bar to compare eras is the whole
          interaction, and the site's standard 500ms fights it */}
      <TooltipProvider delayDuration={150}>
        <div className="life-timeline-bar">
          {/* The eras share the bar with the fixed-width future tail, so
              their percentages are of this inner track, not the bar */}
          <div className="life-timeline-track" ref={trackRef}>
            {segments.map(({ era, width, showLabel, key }) =>
              segment(
                key,
                era,
                {
                  className: cx("life-seg", era.openStart && "life-seg--open"),
                  style: { width: `${width}%`, background: era.color },
                },
                showLabel && (
                  <span className="life-seg-label" aria-hidden="true">
                    {era.title}
                  </span>
                ),
              ),
            )}
          </div>
          {segment(
            FUTURE_KEY,
            future,
            { className: "life-seg life-seg--future" },
            <span className="life-seg-label life-seg-label--future">
              {future.title}
            </span>,
          )}
        </div>
      </TooltipProvider>
      {/* Year rules line up with the segment boundaries above. The first
          era's start is off-screen, so it gets the "keeps going" note
          instead of a tick; the future tail's tick is today. */}
      <div className="life-timeline-axis" aria-hidden="true">
        <div className="life-timeline-track">
          {segments.map(({ width, showYear, year, key }, i) => (
            <span
              className="life-axis-cell"
              key={key}
              style={{ width: `${width}%` }}
            >
              {i === 0 ? (
                <span className="life-axis-open">← {year}</span>
              ) : (
                showYear && <span className="life-axis-year">{year}</span>
              )}
            </span>
          ))}
        </div>
        <span className="life-axis-cell life-axis-cell--future">
          <span className="life-axis-year life-axis-now">now</span>
        </span>
      </div>
    </div>
  );
};

export default LifeTimeline;
