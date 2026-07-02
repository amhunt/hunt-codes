import React, { useEffect, useState, useRef, useCallback } from "react";
import Typed from "typed.js";
import cx from "classnames";

import { GitHub, Linkedin, Mail } from "react-feather";
import { ArrowLeftIcon, Wand2 } from "lucide-react";
import useWindowSize from "./useWindowSize";
import SolarOverlays from "./SolarOverlays";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Link } from "react-router-dom";

const typedOptions = {
  loop: true,
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

const isChrome = navigator.userAgent.includes("Chrome");

const Home = () => {
  const [logoOpacity, setLogoOpacity] = useState(0);

  const size = useWindowSize();
  const isSmall = size === "sm";

  const typedEl = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const typed = new Typed(typedEl.current, typedOptions);
    return () => {
      typed.destroy();
    };
  }, [isSmall]);

  // show spinning logo after mount
  useEffect(() => {
    const timeout = setTimeout(() => setLogoOpacity(1), 3000);
    return () => clearTimeout(timeout);
  }, []);

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText("andrew+in@hunt.codes");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy email: ", err);
    }
  }, []);

  return (
    <>
      <SolarOverlays />
      <div className="homePageBackLink">
        <Link
          className={cx("mt-4 flex items-center gap-1 transition-transform")}
          to="/"
        >
          <ArrowLeftIcon className="starIcon" size={16} />
          <span>Back to space</span>
        </Link>
      </div>
      <main className={cx("homeInfoContainer", logoOpacity === 1 && "show")}>
        {isSmall && (
          <div className="sm-screen-summary-line max-w-[200px] text-center">
            Frontend Engineer
          </div>
        )}
        <p className="hoverableHomeItem justify-between gap-6">
          {!isSmall && (
            <div className="max-w-[300px] text-left text-lg font-bold">
              Frontend Engineer based in <s>SF</s> NYC
            </div>
          )}
          <div className="flex items-center gap-1">
            <a
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.linkedin.com/in/andrewmhunt/"
              className="flex size-8 items-center justify-center rounded-full p-1 transition-colors hover:bg-[#5efffc57]"
            >
              <Linkedin size={20} />
            </a>
            <a
              aria-label="GitHub"
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.github.com/amhunt"
              className="flex size-8 items-center justify-center rounded-full p-1 transition-colors hover:bg-[#5efffc57]"
            >
              <GitHub size={20} />
            </a>
            <TooltipProvider>
              <Tooltip disableHoverableContent>
                <TooltipTrigger>
                  <Link
                    aria-label="SVG Studio"
                    to="/draw"
                    className="flex size-8 items-center justify-center rounded-full p-1 transition-colors hover:bg-[#5efffc57]"
                  >
                    <Wand2 size={20} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>SVG Studio</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider
              skipDelayDuration={0}
              delayDuration={0}
              disableHoverableContent
            >
              <Tooltip disableHoverableContent defaultOpen={copied}>
                <TooltipTrigger onClick={(e) => e.preventDefault()}>
                  <button
                    aria-label="Copy email address"
                    aria-description="andrew+in@hunt.codes"
                    // eslint-disable-next-line -- TODO: rm this comment and fix the lint error
                    onClick={() => handleCopy()}
                    className="flex size-8 items-center justify-center rounded-full p-1 transition-colors hover:bg-[#5efffc57]"
                  >
                    <Mail size={20} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  onPointerDownOutside={(e) => e.preventDefault()}
                >
                  <p>andrew+in@hunt.codes ({copied ? "copied" : "copy"})</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </p>
        {/* Moved to computer for large screens */}
        {/* {isMdOrLess && ( */}
        <p className="hoverableHomeItem h-20 gap-0">
          <div>
            <span
              ref={typedEl}
              id="typed-js"
              className="font-bold"
              aria-description="email address: andrew@hunt.codes"
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
        </p>
        {/* )} */}
        {!isChrome && !isSmall && (
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
