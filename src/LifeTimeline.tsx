import React, { useEffect, useMemo, useRef, useState } from "react";
import cx from "classnames";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import airbnbLogo from "./assets/logos/airbnb.svg";
import argosLogo from "./assets/logos/argos.svg";
import princetonLogo from "./assets/logos/princeton.svg";
import untappedLogo from "./assets/logos/untapped.svg";
import zipLogo from "./assets/logos/zip.svg";

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
  /** Company mark shown in the bar — three eras are all "Engineer", and
   *  the logo is what tells them apart at a glance */
  logo?: string;
  /** The logo's rendered width at the bar's 16px logo height, for the
   *  fit gate; square marks leave it off (LOGO_PX). Wordmarks run wider. */
  logoWidth?: number;
  /** What the bar says next to the logo, when it isn't the title: a
   *  company name, or `null` for logo only (Zip's mark is its name). The
   *  tooltip and aria-label always carry the title. */
  label?: string | null;
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
    logo: princetonLogo,
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
    logo: airbnbLogo,
    label: "Airbnb",
    location: "San Francisco",
    dates: "2017 – 2020",
    blurb:
      "Pricing and availability across Experiences, 20+ A/B tests, and the org's migration to TypeScript.",
    color: "#7a5ce6",
    start: ym(2017, 7),
    end: ym(2020, 7),
  },
  {
    title: "Engineer",
    org: "Untapped (fka Jumpstart)",
    logo: untappedLogo,
    label: "Jumpstart",
    location: "San Francisco",
    dates: "2020 – 2021",
    blurb:
      "Launched the Recruiter Analytics platform and led the frontend platform group.",
    color: "#9d78f5",
    start: ym(2020, 7),
    end: ym(2021, 7),
  },
  {
    title: "Staff Engineer",
    org: "Zip",
    logo: zipLogo,
    logoWidth: 24,
    label: null,
    location: "San Francisco",
    dates: "2021 – 2025",
    blurb:
      "Four years on the procurement platform: shared components, CI and DevX, build and deploy, 99% type safety.",
    color: "#6b4ad8",
    start: ym(2021, 7),
    end: ym(2025, 2),
  },
  {
    title: "Sabbatical + Contract Work",
    org: "Argos",
    logo: argosLogo,
    logoWidth: 48,
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
 * Where the time axis starts: the first era that isn't `openStart`.
 * Childhood sits off the axis as a fixed-width stub on the left (see
 * --life-child-w) — at true scale it's over half a life so far, and the
 * interesting part is the right end, which now gets the whole track.
 */
const VISIBLE_START = Math.min(
  ...eras.filter((era) => !era.openStart).map((era) => era.start),
);

/**
 * Inconsolata's advance is half its size, so an 11px label is ~5.6px a
 * character; add the segment's own padding. A segment narrower than its
 * label renders bare and lets the color and the tooltip do the talking.
 */
const LABEL_PX_PER_CHAR = 5.6;
const LABEL_PADDING_PX = 16;
/** A square mark's width at the bar's 16px logo height (.life-seg-logo);
 *  wordmarks say their own (Era.logoWidth) */
const LOGO_PX = 16;
/** The gap between a logo and its text (.life-seg-label's gap) */
const LOGO_GAP_PX = 5;
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

// The geometry never changes after load (the running era ends at this
// month), so it's laid out once: each era's share of the track and the
// narrowest segment its label fits in. Only the fits-or-not booleans
// depend on the live bar width.
const now = new Date();
const today = ym(now.getFullYear(), now.getMonth() + 1);
const span = today - VISIBLE_START;
/** The bar text for an era: its label if it has one, else its title */
const barText = (era: Era) =>
  era.label === undefined ? era.title : (era.label ?? "");

const layout = eras.map((era) => ({
  era,
  /** Share of the time axis (the track less the childhood stub), as a
   *  percentage; the stub itself has none */
  width: era.openStart
    ? 0
    : (((era.end ?? today) - Math.max(era.start, VISIBLE_START)) / span) * 100,
  // The stub always shows its word: it's sized for it (.life-seg--open
  // sets a smaller face), and the fit gate has nothing to measure it
  // against since its width comes from CSS. Two gates for the rest: the
  // logo alone, and the logo with its text — a segment too narrow for
  // both still shows the mark.
  logoMinPx: era.logo
    ? (era.logoWidth ?? LOGO_PX) + LABEL_PADDING_PX
    : Infinity,
  labelMinPx: era.openStart
    ? 0
    : twoLineChars(barText(era)) * LABEL_PX_PER_CHAR +
      LABEL_PADDING_PX +
      (era.logo ? (era.logoWidth ?? LOGO_PX) + LOGO_GAP_PX : 0),
  year: Math.floor(era.start),
  key: `${era.title}-${era.dates}`,
}));

/** A cell's width: its share of the axis, which is the track less the
 *  childhood stub (the stub's own width comes from CSS) */
const cellWidth = (width: number, openStart?: boolean) =>
  openStart ? undefined : `calc((100% - var(--life-child-w)) * ${width / 100})`;

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

  // The band sits on the bottom edge of the screen, so while it's mounted
  // the bottom-left controls climb above it (App.scss, next to
  // .music-toggle, keys off this class)
  useEffect(() => {
    document.body.classList.add("life-timeline-present");
    return () => document.body.classList.remove("life-timeline-present");
  }, []);

  const segments = useMemo(
    () =>
      layout.map((cell) => {
        const px = (trackWidth * cell.width) / 100;
        return {
          ...cell,
          showLabel: px >= cell.labelMinPx,
          showLogo: px >= cell.logoMinPx,
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

  // Tap-off closes. Radix dismisses the card on a pointer-down outside
  // it, but on touch it waits for the follow-up click (browsers delay
  // that ~300ms), so close on the pointer-down itself and the tap on the
  // résumé feels immediate. A tap on another segment is left to that
  // segment's own toggle; one on the open card leaves it up.
  useEffect(() => {
    if (openKey === null) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest(".life-seg, .life-tip-card")) return;
      setOpenKey(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openKey]);

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
          onClick={(event) => {
            // Our toggle is the one that decides. Radix composes its own
            // close-on-click after this handler and skips it once the
            // event is default-prevented — without that, a tap that
            // should open could be closed again in the same click.
            event.preventDefault();
            setOpenKey(wasOpen.current ? null : key);
          }}
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
            {segments.map(({ era, width, showLabel, showLogo, key }) =>
              segment(
                key,
                era,
                {
                  className: cx("life-seg", era.openStart && "life-seg--open"),
                  style: {
                    width: cellWidth(width, era.openStart),
                    background: era.color,
                  },
                },
                (showLabel || showLogo) && (
                  <span className="life-seg-label" aria-hidden="true">
                    {era.logo && showLogo && (
                      <img className="life-seg-logo" src={era.logo} alt="" />
                    )}
                    {showLabel && barText(era) && <span>{barText(era)}</span>}
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
      {/* Year rules line up with the segment boundaries above. The
          childhood stub gets no tick (its start is decades off the axis);
          the future tail's tick is today. */}
      <div className="life-timeline-axis" aria-hidden="true">
        <div className="life-timeline-track">
          {segments.map(({ era, width, showYear, year, key }) => (
            <span
              className={cx(
                "life-axis-cell",
                era.openStart && "life-axis-cell--open",
              )}
              key={key}
              style={{ width: cellWidth(width, era.openStart) }}
            >
              {!era.openStart && showYear && (
                <span className="life-axis-year">{year}</span>
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
