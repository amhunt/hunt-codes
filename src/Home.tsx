import React, { useEffect, useState, useRef, useCallback } from "react";
import Typed from "typed.js";
import cx from "classnames";

import { GitHub, Linkedin, Mail } from "react-feather";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import useWindowSize from "./useWindowSize";
import useScrollJourney from "./useScrollJourney";
import SolarOverlays from "./SolarOverlays";
import ScrollHint from "./ScrollHint";
import GalaxyIcon from "./ui/GalaxyIcon";
import { JOURNEY_STOPS } from "./scrollTransition";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Link } from "react-router-dom";

// While /home is up, the scene switches dock in the bottom-right corner
// the coin sits out here — App.scss `body.on-home` rules, the same dock
// the landing uses, so neither switch moves on the hop between them
const HOME_BODY_CLASS = "on-home";

const typedOptions = {
  // The one-shot intro stays under reduced motion (a deliberate
  // entrance, same policy as the CSS one-shots); only the infinite
  // erase/retype cycle stops.
  loop: !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  // Disable this if switching back to the Mac view
  showCursor: true,
  smartBackspace: true,
  fadeOut: true,
  startDelay: 1000,
  fadeOutDelay: 5000,
  stringsElement: "#typed-strings",
  typeSpeed: 50,
  autoInsertCss: false,
};

// Chrome, Edge, Brave and Opera all carry "Chrome" in their UA, so this
// matches the whole family
const isChromium = navigator.userAgent.includes("Chrome");

// Touch screens: the copy tooltip says "tap", and its 2s reset ignores
// :hover — iOS Safari leaves an element hovered after a tap, which kept
// the tooltip open until the next one
const isTouch = window.matchMedia?.("(hover: none)").matches ?? false;

// The arrival swoop lands at 2s, the content fade runs a beat past it,
// and the hint follows once the page has settled
const HINT_DELAY_MS = 3800;

const Home = () => {
  const [logoOpacity, setLogoOpacity] = useState(0);

  // Scroll-scrubbed travel: up retreats to the landing, down continues
  // out to /about (scrollTransition.ts)
  const engaged = useScrollJourney(1);

  const size = useWindowSize();
  const isSmall = size === "sm";
  // 768–999px: too little width to seat the pills beside the headline at
  // all, so they leave the row and sit under the typed greeting
  const isMedium = size === "md";

  const typedEl = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const typed = new Typed(typedEl.current, typedOptions);
    return () => {
      typed.destroy();
    };
  }, [isSmall]);

  useEffect(() => {
    document.body.classList.add(HOME_BODY_CLASS);
    return () => document.body.classList.remove(HOME_BODY_CLASS);
  }, []);

  // Reveal the content as the 2s swoop lands. typed.js starts at 1s, so
  // the greeting is already mid-type as the container fades in.
  useEffect(() => {
    const timeout = setTimeout(() => setLogoOpacity(1), 2000);
    return () => clearTimeout(timeout);
  }, []);

  const [copied, setCopied] = useState(false);
  const [copyTooltipOpen, setCopyTooltipOpen] = useState(false);
  const copyTriggerRef = useRef<HTMLButtonElement>(null);
  const pinCopyTooltipOpen = useRef(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(copyResetTimer.current), []);

  const pinCopyTooltip = useCallback(() => {
    pinCopyTooltipOpen.current = true;
    setCopyTooltipOpen(true);
  }, []);

  const handleCopyTooltipOpenChange = useCallback((open: boolean) => {
    if (!open && pinCopyTooltipOpen.current) return;
    setCopyTooltipOpen(open);
  }, []);

  const handleCopy = useCallback(async () => {
    pinCopyTooltip();
    try {
      await navigator.clipboard.writeText("andrew@hunt.codes");
      setCopied(true);
      // An older timer must not un-pin the fresh state on rapid re-clicks
      clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => {
        setCopied(false);
        pinCopyTooltipOpen.current = false;
        const isHovering =
          !isTouch && (copyTriggerRef.current?.matches(":hover") ?? false);
        setCopyTooltipOpen(isHovering);
      }, 2000);
    } catch (err) {
      pinCopyTooltipOpen.current = false;
      console.error("Failed to copy email: ", err);
    }
  }, [pinCopyTooltip]);

  return (
    <>
      <SolarOverlays />
      {/* Icon-only: the label lives in the tooltip and aria-label, so the
          corner stays a chevron and a galaxy. The chevron bounces while
          any of the link is hovered (App.scss .back-to-orbit). */}
      <div className="homePageBackLink">
        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <Link
              className="back-to-orbit mt-4 flex items-center"
              to="/"
              aria-label="Back to orbit"
            >
              <ChevronLeft
                aria-hidden="true"
                className="back-to-orbit-chevron"
                size={16}
              />
              <GalaxyIcon aria-hidden="true" className="starIcon" size={48} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={6}>
            <p>Back to orbit</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <main
        className={cx(
          "homeInfoContainer",
          isMedium && "pills-below",
          logoOpacity === 1 && "show",
        )}
      >
        <h1 className="sr-only">Andrew Hunt — home</h1>
        {/* No max-width cap (App.scss sizes it to the phone): at 300px the
            availability line wrapped, orphaned "2026", and ran into
            Earth's ABOUT ME ring on short phones */}
        {isSmall && (
          <div className="sm-screen-summary-line text-center">
            Frontend Engineer ·{" "}
            {/* Keep the city pair together — at 240px this broke after
                the strikethrough and orphaned "NYC", doubling the block's
                height and pushing it into the icons */}
            <span className="whitespace-nowrap">
              <s className="opacity-70 decoration-[#ff6b6b] decoration-2">SF</s>{" "}
              NYC
            </span>
            <div className="availability-line">
              consulting now · open to full-time,{" "}
              <span className="whitespace-nowrap">fall 2026</span>
            </div>
          </div>
        )}
        <div className="hoverableHomeItem identity-row justify-between gap-6">
          {!isSmall && (
            <div className="identity-text max-w-100 text-left font-bold">
              Frontend Engineer based in{" "}
              <s className="opacity-70 decoration-[#ff6b6b] decoration-2">SF</s>{" "}
              NYC
            </div>
          )}
          {/* One row in DOM order at every width. On md the row leaves
              the identity line's side entirely and drops under the typed
              greeting (`.pills-below` in App.scss), which is what buys
              the availability line the panel's full width there.
              Tooltips never open from a touch pointer, so on phones each
              pill also carries a caption — the only name the shopping bag
              gets there. */}
          <div className="icon-pill-row flex items-start justify-end gap-1">
            <span className="icon-pill-slot">
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <a
                    aria-label="LinkedIn"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://www.linkedin.com/in/andrewmhunt/"
                    className="icon-pill flex size-12 items-center justify-center rounded-full p-1"
                  >
                    <Linkedin size={22} />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>LinkedIn</p>
                </TooltipContent>
              </Tooltip>
              {isSmall && <span className="icon-pill-caption">LinkedIn</span>}
            </span>
            <span className="icon-pill-slot">
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <a
                    aria-label="GitHub"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://www.github.com/amhunt"
                    className="icon-pill flex size-12 items-center justify-center rounded-full p-1"
                  >
                    <GitHub size={22} />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>GitHub</p>
                </TooltipContent>
              </Tooltip>
              {isSmall && <span className="icon-pill-caption">GitHub</span>}
            </span>
            <span className="icon-pill-slot">
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <Link
                    aria-label="Artifacts"
                    to="/artifacts"
                    className="icon-pill flex size-12 items-center justify-center rounded-full p-1"
                  >
                    <ShoppingBag size={20} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Artifacts by Andy Shop — 3D Printed Goods</p>
                </TooltipContent>
              </Tooltip>
              {isSmall && <span className="icon-pill-caption">Shop</span>}
            </span>
            <span className="icon-pill-slot">
              <Tooltip
                disableHoverableContent
                open={copyTooltipOpen}
                onOpenChange={handleCopyTooltipOpenChange}
              >
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    ref={copyTriggerRef}
                    aria-label="Copy email address andrew@hunt.codes"
                    onPointerDown={() => pinCopyTooltip()}
                    onClick={() => void handleCopy()}
                    className="icon-pill flex size-12 items-center justify-center rounded-full p-1"
                  >
                    <Mail size={22} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  onPointerDownOutside={(e) => e.preventDefault()}
                >
                  <p>
                    {copied
                      ? "Email copied!"
                      : `andrew@hunt.codes — ${isTouch ? "tap" : "click"} to copy`}
                  </p>
                </TooltipContent>
              </Tooltip>
              {isSmall && <span className="icon-pill-caption">Email</span>}
            </span>
          </div>
        </div>
        {/* Moved to computer for large screens */}
        {/* {isMdOrLess && ( */}
        {/* Full panel width, below the row rather than inside it: beside
            four 48px pills there is only ~230px left at 1280 and the line
            needs 315, so it broke as "open to full-" / "time, fall 2026".
            Widening the panel instead would have run it under the
            satellite, which is placed to clear the old width. */}
        {!isSmall && (
          <div className="availability-line">
            consulting now · open to full-time,{" "}
            <span className="whitespace-nowrap">fall 2026</span>
          </div>
        )}
        <div className="hoverableHomeItem typed-row h-20 gap-0">
          <div className="typed-greeting">
            <span
              ref={typedEl}
              id="typed-js"
              aria-description="Animated intro message"
            />
          </div>
          <div id="typed-strings">
            <p>interested in working together?</p>
            <p>
              reach out to{" "}
              <a href="mailto:andrew+contact@hunt.codes">andrew@hunt.codes</a>
            </p>
            <p>hey there!</p>
          </div>
        </div>
        {/* )} */}
        {!isChromium && !isSmall && (
          <>
            <div className="absolute rounded bg-white p-4 text-sm leading-tight">
              You are using a browser other than Chrome (🚩)
              <br />
              Some animations are disabled, and some styles may not appear as
              intended.
            </div>
            <div className="mt-12" />
          </>
        )}
      </main>
      {/* Home is a waypoint, not the end of the line — the resume is one
          scroll further out and nothing else says so. Waits ~2s for the
          swoop and content fade first. */}
      <ScrollHint
        target={JOURNEY_STOPS.about}
        delayMs={HINT_DELAY_MS}
        hidden={engaged}
      />
    </>
  );
};

export default Home;
