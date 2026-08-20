import React, { useEffect, useState, useRef, useCallback } from "react";
import Typed from "typed.js";
import cx from "classnames";

import { GitHub, Linkedin, Mail } from "react-feather";
import { ArrowLeftCircleIcon, PenLine, Wand2 } from "lucide-react";
import useWindowSize from "./useWindowSize";
import useScrollJourney from "./useScrollJourney";
import SolarOverlays from "./SolarOverlays";
import ScrollHint from "./ScrollHint";
import ZipVideoMoon from "./ZipVideoMoon";
import { JOURNEY_STOPS } from "./scrollTransition";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TOOLTIP_DELAY_MS,
} from "./ui/tooltip";
import { Link } from "react-router-dom";

const typedOptions = {
  // The one-shot typing intro stays under reduced motion (it's a
  // deliberate entrance, same policy as the CSS one-shots); only the
  // infinite erase/retype cycle stops.
  loop: !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  // This needs to be disabled if switching back to the Mac view
  showCursor: true,
  smartBackspace: true,
  fadeOut: true,
  startDelay: 1000,
  fadeOutDelay: 5000,
  stringsElement: "#typed-strings",
  typeSpeed: 50,
  autoInsertCss: false,
};

// Chromium-based browsers (Chrome, Edge, Brave, Opera) all include "Chrome"
// in their UA, so this matches the whole family
const isChromium = navigator.userAgent.includes("Chrome");

// The arrival swoop lands at 2s and the content fade runs a beat past it;
// the hint follows once the page has settled
const HINT_DELAY_MS = 3800;

const Home = () => {
  const [logoOpacity, setLogoOpacity] = useState(0);

  // Scroll-scrubbed travel: up retreats toward the landing view, down
  // continues out to /about (scrollTransition.ts)
  const engaged = useScrollJourney(1);

  const size = useWindowSize();
  const isSmall = size === "sm";
  // The moon's video popover (ZipVideoMoon), same as /about. Below lg the
  // moon sits out of the home view entirely (SolarScene's hideHomeExtras),
  // so there'd be nothing for the overlay to glue itself to.
  const [videoOpen, setVideoOpen] = useState(false);
  const moonLinkActive = size === "lg";

  const typedEl = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const typed = new Typed(typedEl.current, typedOptions);
    return () => {
      typed.destroy();
    };
  }, [isSmall]);

  // Reveal the page content as the 2s arrival swoop lands (the 1s fade
  // starts right at touchdown; typed.js starts at 1s so the greeting is
  // already mid-type as the container fades in)
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
      // Rapid re-clicks must not let an older timer un-pin the fresh state
      clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => {
        setCopied(false);
        pinCopyTooltipOpen.current = false;
        const isHovering = copyTriggerRef.current?.matches(":hover") ?? false;
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
      {/* The moon doubles as the Zip brand-video link here too (overlay +
          popover); `video-mode` on <body> hides the rest of the page */}
      {moonLinkActive && (
        <ZipVideoMoon open={videoOpen} onOpenChange={setVideoOpen} />
      )}
      <div className="homePageBackLink">
        <Link
          className={cx("mt-4 flex items-center gap-1 transition-transform")}
          to="/"
        >
          <ArrowLeftCircleIcon className="starIcon" size={16} />
          <span>Back to orbit</span>
        </Link>
      </div>
      <main className={cx("homeInfoContainer", logoOpacity === 1 && "show")}>
        <h1 className="sr-only">Andrew Hunt — home</h1>
        {isSmall && (
          <div className="sm-screen-summary-line max-w-75 text-center">
            Frontend Engineer ·{" "}
            {/* Keep the city pair together — at 240px this broke after the
                strikethrough and orphaned "NYC" onto its own line, which
                doubled the block's height and pushed it into the icons */}
            <span className="whitespace-nowrap">
              <s className="opacity-70 decoration-[#ff6b6b] decoration-2">SF</s>{" "}
              NYC
            </span>
            <div className="availability-line">
              consulting now · open to full-time, fall 2026
            </div>
          </div>
        )}
        <div className="hoverableHomeItem justify-between gap-6">
          {!isSmall && (
            <div className="max-w-75 text-left">
              <div className="font-bold">
                Frontend Engineer based in{" "}
                <s className="opacity-70 decoration-[#ff6b6b] decoration-2">
                  SF
                </s>{" "}
                NYC
              </div>
              <div className="availability-line">
                consulting now · open to full-time, fall 2026
              </div>
            </div>
          )}
          {/* One provider for the whole row: every icon opens with the same
              slight hover delay, and sliding along the row skips it (Radix's
              default skip grace), like native toolbar tooltips */}
          <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
            <div className="flex items-center gap-1">
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
              {/* Below lg the blog-post asteroid sits out (SolarOverlays hides
                  the link trio), so the site's one work sample needs a home in
                  the icon row instead */}
              {size !== "lg" && (
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <a
                      aria-label="A blog post I wrote at Zip"
                      target="_blank"
                      rel="noopener noreferrer"
                      href="https://engineering.ziphq.com/material-ui/"
                      className="icon-pill flex size-12 items-center justify-center rounded-full p-1"
                    >
                      <PenLine size={20} />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>A blog post I wrote at Zip</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <Link
                    aria-label="SVG Studio"
                    to="/draw"
                    className="icon-pill flex size-12 items-center justify-center rounded-full p-1"
                  >
                    <Wand2 size={20} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>SVG Studio</p>
                </TooltipContent>
              </Tooltip>
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
                      : "andrew@hunt.codes — click to copy"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
        {/* Moved to computer for large screens */}
        {/* {isMdOrLess && ( */}
        <div className="hoverableHomeItem h-20 gap-0">
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
      {/* Home is a waypoint, not the end of the line — the résumé is one
          more scroll further out, and nothing else says so. Waits for the
          arrival swoop and the content fade (~2s) to finish first. */}
      <ScrollHint
        target={JOURNEY_STOPS.about}
        delayMs={HINT_DELAY_MS}
        hidden={engaged}
        // /home renders the "Enable space jams" pill; the landing page doesn't
        clearsBottomLeftControl
      />
    </>
  );
};

export default Home;
