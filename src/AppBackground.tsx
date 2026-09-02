import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
  lazy,
  Suspense,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import cx from "classnames";

import GoldenGate from "./gg-bridge.png";
import GoldenGateFog from "./GoldenGateFog";
import useWindowSize from "useWindowSize";
import { onSynthNote } from "./synthAudio";
import SpaceJamSwitch from "./SpaceJamSwitch";
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
  const navigate = useNavigate();
  // Stable identity (Space3DBackground is memo'd against this component's
  // 200ms ticker re-renders) that also swallows navigate's promise
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const journeyNavigate = useCallback((to: string) => {
    void navigateRef.current(to);
  }, []);

  const isHomePage = location.pathname.includes("home");
  // /draw shares the about-page background (Earth + moon in the 3D scene)
  const isAboutPage =
    location.pathname.includes("about") || location.pathname.includes("draw");
  // The synth solar system (the 808-pad easter egg's destination)
  const isSynthPage = location.pathname.includes("synth");
  // The /journey story crawl's open-space cruise
  const isJourneyPage = location.pathname.includes("journey");
  const isLanding = location.pathname === "/" || location.pathname === "";

  const [highlightedCharIdx, setHighlightedCharIdx] = useState(0);

  useEffect(() => {
    // The nameTitle SVG this drives only renders off the landing page, so
    // don't fire a 5x/sec state update + re-render on the landing route.
    if (isLanding) return;
    // On /synth the ticker keeps time with the music instead of the
    // clock: every audible note — arp step or keyboard press — advances
    // the highlighted letter (and silence holds it still). Everywhere
    // else the plain 200ms march stays.
    if (isSynthPage) {
      return onSynthNote(() => {
        setHighlightedCharIdx((idx) => (idx + 1) % nameArr.length);
      });
    }
    const interval = setInterval(() => {
      setHighlightedCharIdx((idx) => (idx + 1) % nameArr.length);
    }, 200);
    return () => clearInterval(interval);
  }, [isLanding, isSynthPage]);

  return (
    <>
      {/* Keep the landing page's solar-system intro uncluttered — the music
          switch only appears once the visitor has entered */}
      {!isLanding && <SpaceJamSwitch />}
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
            isSynthPage={isSynthPage}
            isJourneyPage={isJourneyPage}
            onJourneyNavigate={journeyNavigate}
          />
        </Suspense>
      </BackgroundErrorBoundary>
      {isHomePage && (
        <>
          {/* <RetroMac /> */}
          <img
            className={`App-gg-bridge ${
              showBridge && !isNightMode ? "App-gg-bridge-opaque" : ""
            }`}
            src={GoldenGate}
            alt="Golden Gate Bridge"
          />
          <GoldenGateFog visible={showBridge && !isNightMode} />
        </>
      )}
    </>
  );
};

export default memo(AppBackground);
