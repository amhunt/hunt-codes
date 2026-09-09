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
import { nameHighlightState } from "./nameHighlight";
import { NAME_TITLE_ID } from "./solarAnchorIds";

/** The Golden Gate bridge + fog on /home is parked for now — the asset,
 *  the fog component and the .App-gg-bridge styles all stay, so flipping
 *  this brings it back as it was. */
const SHOW_GOLDEN_GATE = false;
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
const andrewHunt = "ANDREWHUNT";
const nameArr: string[] = [];
for (const c of andrewHunt) {
  nameArr.push(c);
}

const AppBackground = ({
  showBridge,
  isSpaceView,
}: {
  showBridge: boolean;
  /** User-toggled (App.tsx's Space/Mesh switch); space is the default */
  isSpaceView: boolean;
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
  // /draw and /artifacts share the about-page background (Earth + moon in
  // the 3D scene)
  const isAboutPage =
    location.pathname.includes("about") ||
    location.pathname.includes("draw") ||
    location.pathname.includes("artifacts");
  // The shop, which keeps the name stars but parks their roving highlight
  const isArtifactsPage = location.pathname.includes("artifacts");
  // The satellite close-up (the Sputnik link's destination)
  const isProjectsPage = location.pathname.includes("projects");
  // The synth solar system (the 808-pad easter egg's destination)
  const isSynthPage = location.pathname.includes("synth");
  // The /journey story crawl's open-space cruise
  const isJourneyPage = location.pathname.includes("journey");
  const isLanding = location.pathname === "/" || location.pathname === "";

  const [highlightedCharIdx, setHighlightedCharIdx] = useState(0);

  useEffect(() => {
    // The name header this drives (the star field's NameStars) only
    // renders off the landing page, so don't fire a 5x/sec state update
    // + re-render on the landing route. /artifacts keeps the stars and
    // their twinkle but not the roving letter, so it sits this out too.
    if (isLanding || isArtifactsPage) return;
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
  }, [isLanding, isArtifactsPage, isSynthPage]);

  // Mirror the highlight for the WebGL name stars, which read it per frame
  // rather than having the ticker re-render the memo'd canvas tree. -1 on
  // /artifacts: without it the letter the ticker stopped on would stay
  // swollen and lit for the whole visit.
  useEffect(() => {
    nameHighlightState.letter = isArtifactsPage ? -1 : highlightedCharIdx;
  }, [highlightedCharIdx, isArtifactsPage]);

  return (
    <>
      {!isLanding && (
        <svg
          id={NAME_TITLE_ID}
          // The star field draws the name over this box (NameStars) in
          // both views now that both grounds are dark — the SVG stays
          // mounted, invisible, for its layout and its accessible text.
          // It can't take the job back: `.nameTitle` is
          // `mix-blend-mode: multiply`, which resolves to black on a dark
          // ground whatever fill it carries.
          className="nameTitle opacity-0 pointer-events-none"
          viewBox={size === "lg" ? "0 0 200 20" : "0 0 100 20"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <text textLength="100%" color="#004225">
            {nameArr.map((c, idx) => (
              <tspan
                key={idx}
                className={cx(
                  highlightedCharIdx === idx && "highlightedChar",
                  c === "H" ? "z-10" : "z-0",
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
          "App-background_mesh",
          isSpaceView ? "off" : "on",
        )}
      />
      <div
        className={cx(
          "App-background",
          "App-background_space",
          "webgl",
          isSpaceView ? "on" : "off",
        )}
      />
      <BackgroundErrorBoundary>
        <Suspense fallback={null}>
          <Space3DBackground
            isSpaceView={isSpaceView}
            isLanding={isLanding}
            isHomePage={isHomePage}
            isAboutPage={isAboutPage}
            isArtifactsPage={isArtifactsPage}
            isProjectsPage={isProjectsPage}
            isSynthPage={isSynthPage}
            isJourneyPage={isJourneyPage}
            onJourneyNavigate={journeyNavigate}
          />
        </Suspense>
      </BackgroundErrorBoundary>
      {isHomePage && SHOW_GOLDEN_GATE && (
        <>
          {/* <RetroMac /> */}
          <img
            className={`App-gg-bridge ${
              showBridge && !isSpaceView ? "App-gg-bridge-opaque" : ""
            }`}
            src={GoldenGate}
            alt="Golden Gate Bridge"
          />
          <GoldenGateFog visible={showBridge && !isSpaceView} />
        </>
      )}
    </>
  );
};

export default memo(AppBackground);
