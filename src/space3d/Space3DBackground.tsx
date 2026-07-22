import React, { memo, Suspense } from "react";

import SpaceCanvas from "./SpaceCanvas";
import StarField from "./StarField";
import BadgeMedallion from "./BadgeMedallion";
import SolarScene from "./solar/SolarScene";

/**
 * Entry point for the WebGL background (lazy-loaded so three.js ships as
 * its own chunk). Two canvases:
 *
 * - SpaceCanvas: the orthographic pixel-space layer (the GPU star
 *   field). Mounted on every route.
 * - SolarScene: the perspective solar system (hunt-codes-3's scene — sun,
 *   orbiting planets + Earth's moon, camera rig). Mounted on the landing,
 *   home and about routes; the camera swoops between the top-down landing
 *   view, the Earth-perch home view and the moon-perch about view, and the
 *   sun's DOM rings follow the projection (landing/home only).
 *
 * Scenes hide themselves when their DOM anchor is absent, and StarField
 * gates its layers invisible once fully faded, so a day-mode canvas
 * draws almost nothing.
 */

/**
 * The medallion is decorative chrome: if its GLB fails to load or its
 * subtree throws, drop just the coin — never the star field it shares a
 * canvas with.
 */
class BadgeBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const Space3DBackground = ({
  isNightMode,
  isLanding,
  isHomePage,
  isAboutPage,
  isSynthPage,
  isJourneyPage,
  onJourneyNavigate,
}: {
  isNightMode: boolean;
  isLanding: boolean;
  isHomePage: boolean;
  isAboutPage: boolean;
  isSynthPage: boolean;
  isJourneyPage: boolean;
  /** Router navigation for the lightspeed journeys (passed down into the
   *  canvas, where router context can't reach) */
  onJourneyNavigate: (to: string) => void;
}) => {
  return (
    <>
      <SpaceCanvas>
        <StarField isLanding={isLanding} opacityTarget={isNightMode ? 1 : 0} />
        {/* The corner "hunt.codes" medallion rides the star canvas rather
            than bringing its own WebGL context (three contexts tripped
            Chrome's per-domain cap and strobed the stars). Hidden where
            something else owns the corner: /about + /draw (page content)
            and day-mode /home (the Golden Gate Bridge). */}
        {!isAboutPage && !(isHomePage && !isNightMode) && (
          <BadgeBoundary>
            <Suspense fallback={null}>
              <BadgeMedallion />
            </Suspense>
          </BadgeBoundary>
        )}
      </SpaceCanvas>
      {(isLanding ||
        isHomePage ||
        isAboutPage ||
        isSynthPage ||
        isJourneyPage) && (
        <SolarScene
          view={
            isLanding
              ? "landing"
              : isSynthPage
                ? "synth"
                : isJourneyPage
                  ? "journey"
                  : isAboutPage
                    ? "about"
                    : "home"
          }
          isNightMode={isNightMode}
          onNavigate={onJourneyNavigate}
        />
      )}
    </>
  );
};

// memo matters here: AppBackground re-renders every 200ms for the title
// ticker, and this keeps the whole R3F tree out of that loop
export default memo(Space3DBackground);
