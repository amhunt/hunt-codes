import React, {
  useState,
  useEffect,
  useRef,
  memo,
  lazy,
  Suspense,
} from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";

import Galaxy from "./Galaxy";

import GoldenGate from "./gg-bridge.png";
import GoldenGateFog from "./GoldenGateFog";
import useWindowSize from "useWindowSize";
import { Music } from "react-feather";
// import RetroMac from "./RetroMac";

// Loaded on demand so three.js ships as its own chunk
const Space3DBackground = lazy(() => import("./space3d/Space3DBackground"));

/**
 * The background must never take the app down: if the three.js chunk
 * fails to load (stale deploy, flaky network) or the canvas throws,
 * swallow the error (plain sky, no stars) instead of letting it
 * propagate past Suspense and unmount the root.
 */
class BackgroundErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D background failed", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Needed to get hover state on individual chars
const andrewHunt = "andrewhunt";
const nameArr: string[] = [];
for (const c of andrewHunt) {
  nameArr.push(c);
}

const AppBackground = ({
  showBridge,
  isNightMode,
}: {
  showBridge: boolean;
  /** User-toggled (App.tsx's moon/sun switch); night is the default */
  isNightMode: boolean;
}) => {
  const size = useWindowSize();
  const location = useLocation();

  const isHomePage = location.pathname.includes("home");
  const isAboutPage = location.pathname.includes("about");
  const isLanding = location.pathname === "/" || location.pathname === "";
  const [musicEnabled, setMusicEnabled] = useState(false);

  const [highlightedCharIdx, setHighlightedCharIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHighlightedCharIdx((idx) => (idx + 1) % nameArr.length);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isNightMode) {
      timeout = setTimeout(() => setMusicEnabled(true), 4000);
    }
    return () => clearTimeout(timeout);
  }, [isNightMode]);

  // Start the music when the visitor clicks ENTER on the landing page:
  // that click is a user gesture, so play() is allowed. The flag survives
  // one render in case the <audio> isn't mounted yet (musicEnabled flips
  // first, then the re-run of this effect starts playback).
  const prevPathname = useRef(location.pathname);
  const autoplayPending = useRef(false);
  useEffect(() => {
    const cameFromLanding =
      prevPathname.current === "/" || prevPathname.current === "";
    prevPathname.current = location.pathname;
    if (cameFromLanding && isHomePage) {
      autoplayPending.current = true;
    }
    if (!autoplayPending.current) return;
    if (!musicEnabled) {
      setMusicEnabled(true);
      return;
    }
    autoplayPending.current = false;
    document
      .querySelector("audio")
      ?.play()
      // Playback can still be denied (e.g. autoplay policies on a stale
      // gesture) — the visible controls remain the fallback
      .catch(() => {});
  }, [location.pathname, isHomePage, musicEnabled]);

  return (
    <>
      {musicEnabled ? (
        <audio
          controlsList="nodownload"
          // autoPlay
          loop
          className={cx(
            "z-[10000] fixed bottom-4 left-4",
            isNightMode && "nightmode",
          )}
          controls
        >
          <source src="analog.wav" />
        </audio>
      ) : (
        <button
          aria-label="Play music"
          className="fixed bottom-4 left-4 z-[5000] flex size-12 items-center justify-center rounded-full p-2 transition-colors hover:bg-[#5efffc57]"
        >
          <Music onClick={() => setMusicEnabled(true)} />
        </button>
      )}
      {!isLanding && (
        <svg
          className={cx(
            "nameTitle",
            isNightMode
              ? "opacity-30 pointer-events-none fill-white night"
              : "fill-[#004225] opacity-75",
          )}
          viewBox={size === "lg" ? "0 0 200 20" : "0 0 100 20"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <text textLength="100%" color="#004225">
            {nameArr.map((c, idx) => (
              <tspan
                key={idx}
                className={cx(
                  highlightedCharIdx === idx &&
                    (isNightMode
                      ? "highlightedChar_night"
                      : "highlightedChar_day"),
                  c === "h" ? "z-10" : "z-0",
                )}
                alignmentBaseline="hanging"
              >
                {c}
              </tspan>
            ))}
          </text>
        </svg>
      )}
      <div
        className={cx(
          "App-background",
          "App-background_day",
          isNightMode ? "off" : "on",
        )}
      />
      <div
        className={cx(
          "App-background",
          "App-background_night",
          "webgl",
          isNightMode ? "on" : "off",
        )}
      />
      <BackgroundErrorBoundary>
        <Suspense fallback={null}>
          <Space3DBackground
            isNightMode={isNightMode}
            isLanding={isLanding}
            isHomePage={isHomePage}
            isAboutPage={isAboutPage}
          />
        </Suspense>
      </BackgroundErrorBoundary>
      {/* Landing/home/about all render the 3D solar scene (sun, Earth,
          moon), so the SVG Galaxy only remains for the other routes
          (/draw): its sun by day, its moon by night */}
      {!isLanding && !isHomePage && !isAboutPage && (
        <Galaxy isNightMode={isNightMode} />
      )}
      {isHomePage && (
        <>
          {/* <RetroMac /> */}
          <img
            className={`App-gg-bridge ${
              showBridge && !isNightMode ? "App-gg-bridge-opaque" : ""
            }`}
            src={GoldenGate}
            alt="golden gate bridge"
          />
          <GoldenGateFog visible={showBridge && !isNightMode} />
        </>
      )}
    </>
  );
};

export default memo(AppBackground);
