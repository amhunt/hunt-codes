import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Typed from "typed.js";
import cx from "classnames";

import Logo from "./Logo";
import { ChevronLeft, GitHub, Linkedin, Mail, Star } from "react-feather";
import useWindowSize from "./useWindowSize";
import { useCursorPosition } from "./hooks/useCursorPosition";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Link } from "react-router-dom";

const typedOptions = {
  loop: true,
  // Disabled until positioning is fixed
  showCursor: false,
  smartBackspace: true,
  strings: [
    "hey there^500!",
    // "welcome to my website!",
    "sorry for the...^300 tasteless UI",
    "interested in working together?",
    "reach out to andrew^200@hunt.codes^5000",
  ],
  typeSpeed: 50,
};

const isChrome = navigator.userAgent.indexOf("Chrome") > -1;

const Home = () => {
  const leftHalfEl = useRef<HTMLDivElement>(null);

  const [logoOpacity, setLogoOpacity] = useState(0);

  const size = useWindowSize();
  const isSmall = size === "sm";
  const isMdOrLess = size === "sm" || size === "md";

  const { cursorX, cursorY } = useCursorPosition();

  useEffect(() => {
    if (document.getElementById("typed-js")) {
      const typed = new Typed("#typed-js", typedOptions);
      return () => {
        typed.destroy();
      };
    }
  }, [isSmall]);

  // use effect on mount
  useEffect(() => {
    const timeout = setTimeout(() => setLogoOpacity(1), 1000);
    return () => clearTimeout(timeout);
  }, []);

  const docHeight = window.innerHeight;
  const docWidth = window.innerWidth;
  const cursorRatioX = cursorX ? (cursorX / docWidth) * 2 - 1 : 0;
  const cursorRatioY = cursorY ? (cursorY / docHeight) * 2 - 1 : 0;
  let cursorMultiplier1 = 30;
  let cursorMultiplier2 = 50;

  if (isMdOrLess) {
    cursorMultiplier1 = 15;
    cursorMultiplier2 = 25;
  }

  const logoPositioningProps = useMemo(
    () => ({
      paddingLeft1: cursorMultiplier1 * cursorRatioX,
      paddingTop1: cursorMultiplier1 * cursorRatioY + 40,
      paddingLeft2: cursorMultiplier2 * cursorRatioX + (isMdOrLess ? 40 : 100),
      paddingTop2: cursorMultiplier2 * cursorRatioY,
    }),
    [
      cursorMultiplier1,
      cursorRatioY,
      cursorMultiplier2,
      cursorRatioX,
      isMdOrLess,
    ]
  );

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
      <div
        ref={leftHalfEl}
        className="logoWrapper flex items-center justify-center pointer-events-none"
        style={{ opacity: logoOpacity ? 1 : 0 }}
      >
        <Logo {...(!isSmall ? logoPositioningProps : null)} />
      </div>

      <div className="homePageBackLink">
        <Link
          className={cx("flex transition-transform items-center gap-1 mt-4")}
          to="/"
        >
          <ChevronLeft size={16} />
          Back to stars
          <Star className="starIcon" size={16} />
        </Link>
      </div>
      <main className={cx("homeInfoContainer", logoOpacity === 1 && "show")}>
        <p className="hoverableHomeItem justify-between">
          <div className="flex items-center gap-1">
            <span>
              Currently building{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.ziphq.com"
              >
                <b>Zip</b>
              </a>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.linkedin.com/in/andrewmhunt/"
              className="flex transition-colors items-center justify-center w-8 h-8 p-1 rounded-full bg-opacity-25 hover:bg-[#5efffc57]"
            >
              <Linkedin size={20} />
            </a>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.github.com/amhunt"
              className="flex transition-colors items-center justify-center w-8 h-8 p-1 rounded-full hover:bg-[#5efffc57]"
            >
              <GitHub size={20} />
            </a>
            <TooltipProvider
              skipDelayDuration={0}
              delayDuration={0}
              disableHoverableContent
            >
              <Tooltip disableHoverableContent defaultOpen={copied}>
                <TooltipTrigger onClick={(e) => e.preventDefault()}>
                  <button
                    aria-label="Copy email address"
                    onClick={(e) => handleCopy()}
                    className="flex transition-colors items-center justify-center w-8 h-8 p-1 rounded-full hover:bg-[#5efffc57]"
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
        <p className="h-20 hoverableHomeItem">
          <span>
            <span
              id="typed-js"
              className="typed"
              aria-description="email address: andrew@hunt.codes"
            />
          </span>
        </p>
        {/* )} */}
        {!isChrome && !isSmall && (
          <>
            <div className="leading-tight absolute text-sm bg-white p-4 rounded">
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
