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
import { GitHub, Linkedin, Mail, Star } from "react-feather";
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

const isChrome = navigator.userAgent.indexOf("Chrome") > -1;

const Home = () => {
  const leftHalfEl = useRef<HTMLDivElement>(null);

  const [logoOpacity, setLogoOpacity] = useState(0);

  const size = useWindowSize();
  const isSmall = size === "sm";
  const isMdOrLess = size === "sm" || size === "md";

  const cursorPos = useCursorPosition();
  const typedEl = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const typed = new Typed(typedEl.current, typedOptions);
    return () => {
      typed.destroy();
    };
  }, [isSmall]);

  // show spinning logo after mount
  useEffect(() => {
    const timeout = setTimeout(() => setLogoOpacity(1), 1000);
    return () => clearTimeout(timeout);
  }, []);

  const docHeight = window.innerHeight;
  const docWidth = window.innerWidth;
  const cursorRatioX =
    cursorPos?.x != null ? (cursorPos.x / docWidth) * 2 - 1 : 0;
  const cursorRatioY =
    cursorPos?.y != null ? (cursorPos.y / docHeight) * 2 - 1 : 0;
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
      {!isSmall && (
        <div
          ref={leftHalfEl}
          className="logoWrapper flex items-center justify-center pointer-events-none"
          style={{ opacity: logoOpacity ? 1 : 0 }}
        >
          <Logo {...(!isSmall ? logoPositioningProps : null)} />
        </div>
      )}

      <div className="homePageBackLink">
        <Link
          className={cx("flex transition-transform items-center gap-1 mt-4")}
          to="/"
        >
          <Star className="starIcon" size={16} />
        </Link>
      </div>
      <main className={cx("homeInfoContainer", logoOpacity === 1 && "show")}>
        <p className="hoverableHomeItem gap-8 justify-between">
          <div className="flex items-center gap-1">
            <span>
              Most recently at{" "}
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
              aria-label="LinkedIn"
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.linkedin.com/in/andrewmhunt/"
              className="flex transition-colors items-center justify-center w-8 h-8 p-1 rounded-full bg-opacity-25 hover:bg-[#5efffc57]"
            >
              <Linkedin size={20} />
            </a>
            <a
              aria-label="GitHub"
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
                    aria-description="andrew+in@hunt.codes"
                    onClick={() => handleCopy()}
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
        <p className="h-20 hoverableHomeItem gap-0">
          <div>
            <span
              ref={typedEl}
              id="typed-js"
              className="typed font-bold"
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
