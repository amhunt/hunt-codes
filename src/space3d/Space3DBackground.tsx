import React, { memo, Suspense } from "react";

import SpaceCanvas from "./SpaceCanvas";
import StarField from "./StarField";
import BadgeMedallion from "./BadgeMedallion";
import SolarScene from "./solar/SolarScene";

// Night-mode star opacity on the landing page (home/about run at 1)
const LANDING_STAR_OPACITY = 0.8;

/**
 * Entry point for the WebGL background (lazy-loaded so three.js ships as
 * its own chunk). Two canvases:
 *
 * - SpaceCanvas: the orthographic pixel-space layer (the GPU star
 *   field). Mounted on every route.
 * - SolarScene: the perspective solar system (hunt-codes-3's scene — sun,
 *   orbiting planets + Earth's moon, camera rig). Mounted on the landing,
 *   home, about and projects routes; the camera swoops between the
 *   top-down landing view, the Earth-perch home view, the moon-perch about
 *   view and the satellite close-up, and the sun's DOM rings follow the
 *   projection (landing/home only).
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
  isProjectsPage,
  isSynthPage,
  isJourneyPage,
  onJourneyNavigate,
}: {
  isNightMode: boolean;
  isLanding: boolean;
  isHomePage: boolean;
  isAboutPage: boolean;
  /** The satellite close-up (/projects-and-toys) */
  isProjectsPage: boolean;
  isSynthPage: boolean;
  isJourneyPage: boolean;
  /** Router navigation for the lightspeed journeys (passed down into the
   *  canvas, where router context can't reach) */
  onJourneyNavigate: (to: string) => void;
}) => {
  return (
    <>
      <SpaceCanvas>
        {/* The landing page runs its stars 20% dimmer — the glyph field is
            the whole view there and read a touch loud at full strength */}
        <StarField
          isLanding={isLanding}
          opacityTarget={
            isNightMode ? (isLanding ? LANDING_STAR_OPACITY : 1) : 0
          }
        />
        {/* The corner "hunt.codes" medallion rides the star canvas rather
            than bringing its own WebGL context (three contexts tripped
            Chrome's per-domain cap and strobed the stars). Hidden only
            where something else owns the corner: day-mode /home (the
            Golden Gate Bridge). */}
        {!(isHomePage && !isNightMode) && (
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
        isProjectsPage ||
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
                    : isProjectsPage
                      ? "projects"
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
