import React, { useEffect, useState, useRef, useCallback } from "react";
import Typed from "typed.js";
import cx from "classnames";

import { GitHub, Linkedin, Mail } from "react-feather";
import { ArrowLeftCircleIcon } from "lucide-react";
import useWindowSize from "./useWindowSize";
import useScrollJourney from "./useScrollJourney";
import SolarOverlays from "./SolarOverlays";
import RocketCockpit from "./RocketCockpit";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
  startDelay: 3000,
  fadeOutDelay: 5000,
  stringsElement: "#typed-strings",
  typeSpeed: 50,
  autoInsertCss: false,
};

// Chromium-based browsers (Chrome, Edge, Brave, Opera) all include "Chrome"
// in their UA, so this matches the whole family
const isChromium = navigator.userAgent.includes("Chrome");

const Home = () => {
  const [logoOpacity, setLogoOpacity] = useState(0);

  // Scroll-scrubbed travel: up retreats toward the landing view, down
  // continues out to /about (scrollTransition.ts)
  useScrollJourney(1);

  const size = useWindowSize();
  const isSmall = size === "sm";

  const typedEl = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const typed = new Typed(typedEl.current, typedOptions);
    return () => {
      typed.destroy();
    };
  }, [isSmall]);

  // Reveal the page content as the 2s arrival swoop lands (the 1s fade
  // starts right at touchdown; typed.js starts a beat later at 3s, once
  // the container is fully opaque)
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
      await navigator.clipboard.writeText("andrew+in@hunt.codes");
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
      <RocketCockpit />
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
        {isSmall && (
          <div className="sm-screen-summary-line max-w-[240px] text-center">
            Frontend Engineer ·{" "}
            <s className="opacity-70 decoration-[#ff6b6b] decoration-2">SF</s>{" "}
            NYC
          </div>
        )}
        <div className="hoverableHomeItem justify-between gap-6">
          {!isSmall && (
            <div className="max-w-[300px] text-left text-lg font-bold">
              Frontend Engineer based in{" "}
              <s className="opacity-70 decoration-[#ff6b6b] decoration-2">SF</s>{" "}
              NYC
            </div>
          )}
          <div className="flex items-center gap-1">
            <a
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.linkedin.com/in/andrewmhunt/"
              className="flex size-11 items-center justify-center rounded-full p-1 transition-colors hover:bg-[#5efffc57]"
            >
              <Linkedin size={20} />
            </a>
            <a
              aria-label="GitHub"
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.github.com/amhunt"
              className="flex size-11 items-center justify-center rounded-full p-1 transition-colors hover:bg-[#5efffc57]"
            >
              <GitHub size={20} />
            </a>
            {/* <TooltipProvider>
              <Tooltip disableHoverableContent>
                <TooltipTrigger asChild>
                  <Link
                    aria-label="SVG Studio"
                    to="/draw"
                    className="flex size-11 items-center justify-center rounded-full p-1 transition-colors hover:bg-[#5efffc57]"
                  >
                    <Wand2 size={20} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>SVG Studio</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider> */}
            <TooltipProvider
              skipDelayDuration={0}
              delayDuration={0}
              disableHoverableContent
            >
              <Tooltip
                disableHoverableContent
                open={copyTooltipOpen}
                onOpenChange={handleCopyTooltipOpenChange}
              >
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    ref={copyTriggerRef}
                    aria-label="Copy email address andrew+in@hunt.codes"
                    onPointerDown={() => pinCopyTooltip()}
                    onClick={() => void handleCopy()}
                    className="flex size-11 items-center justify-center rounded-full p-1 transition-colors hover:bg-[#5efffc57]"
                  >
                    <Mail size={20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  onPointerDownOutside={(e) => e.preventDefault()}
                >
                  <p>
                    {copied
                      ? "Email copied!"
                      : "andrew+in@hunt.codes — click to copy"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {/* Moved to computer for large screens */}
        {/* {isMdOrLess && ( */}
        <div className="hoverableHomeItem h-20 gap-0">
          <div>
            <span
              ref={typedEl}
              id="typed-js"
              className="font-bold"
              aria-description="Animated intro message"
            />
          </div>
          <div id="typed-strings">
            <p>hey there!</p>
            <p>interested in working together?</p>
            <p>
              reach out to{" "}
              <a href="mailto:andrew+contact@hunt.codes">andrew@hunt.codes</a>
            </p>
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
    </>
  );
};

export default Home;
