import React, { useState, useEffect, memo, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";

import Galaxy from "./Galaxy";

import GoldenGate from "./gg-bridge.png";
import GoldenGateFog from "./GoldenGateFog";
import useWindowSize from "useWindowSize";
import { Music } from "react-feather";
// import RetroMac from "./RetroMac";
import Stars from "Stars";
import supportsWebGL from "./space3d/webglSupport";

// Loaded on demand so three.js ships as its own chunk
const Space3DBackground = lazy(() => import("./space3d/Space3DBackground"));

/**
 * The background must never take the app down: if the three.js chunk
 * fails to load (stale deploy, flaky network) or the canvas throws,
 * fall back to the legacy DOM star field instead of letting the error
 * propagate past Suspense and unmount the root.
 */
class BackgroundErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D background failed; using DOM fallback", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// Needed to get hover state on individual chars
const andrewHunt = "andrewhunt";
const nameArr: string[] = [];
for (const c of andrewHunt) {
  nameArr.push(c);
}

const AppBackground = ({ showBridge }: { showBridge: boolean }) => {
  const size = useWindowSize();
  const location = useLocation();

  const isNightMode = !location.pathname.includes("home");
  const isHomePage = location.pathname.includes("home");
  const isLanding = location.pathname === "/" || location.pathname === "";
  // WebGL background (stars + 3D planets); legacy DOM stars are the fallback
  const webglEnabled = supportsWebGL();
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
          className="fixed z-[5000] bottom-4 left-4 flex transition-colors items-center justify-center w-12 h-12 p-2 rounded-full hover:bg-[#5efffc57]"
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
          webglEnabled && "webgl",
          isNightMode ? "on" : "off",
        )}
      >
        {!webglEnabled && isNightMode && <Stars isLanding={isLanding} />}
      </div>
      {webglEnabled && (
        <BackgroundErrorBoundary
          fallback={
            isNightMode ? (
              // .space-canvas keeps the fallback stars above the night
              // backdrop, where the canvas would have been
              <div className="space-canvas">
                <Stars isLanding={isLanding} />
              </div>
            ) : null
          }
        >
          <Suspense fallback={null}>
            <Space3DBackground
              isNightMode={isNightMode}
              isLanding={isLanding}
            />
          </Suspense>
        </BackgroundErrorBoundary>
      )}
      {!isLanding && <Galaxy isNightMode={isNightMode} />}
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
