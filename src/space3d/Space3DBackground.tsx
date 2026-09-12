import React, { memo, Suspense } from "react";

import SpaceCanvas from "./SpaceCanvas";
import StarField from "./StarField";
import BadgeMedallion from "./BadgeMedallion";
import SolarScene from "./solar/SolarScene";
import WireDriver from "./solar/WireDriver";

// Star opacity on the landing page (home/about run at 1)
const LANDING_STAR_OPACITY = 0.8;

/**
 * Entry point for the WebGL background (lazy-loaded so three.js ships as
 * its own chunk). Two canvases:
 *
 * - SpaceCanvas: the orthographic pixel-space layer (the GPU star
 *   field). Mounted on every route.
 * - SolarScene: the perspective solar system (hunt-codes-3's scene — sun,
 *   orbiting planets + Earth's moon, camera rig). Mounted on the landing,
 *   home, about, artifacts and projects routes; the camera swoops between
 *   the top-down landing view, the sun-perch home view, the Earth-perch
 *   about view, the moon-perch artifacts view and the satellite close-up,
 *   and the sun's DOM rings follow the projection (landing/home only).
 *
 * Scenes hide themselves when their DOM anchor is absent, and StarField
 * gates its layers invisible once fully faded.
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
  isSpaceView,
  isLanding,
  isHomePage,
  isAboutPage,
  isArtifactsPage,
  isProjectsPage,
  isSynthPage,
  isJourneyPage,
  onJourneyNavigate,
}: {
  isSpaceView: boolean;
  isLanding: boolean;
  isHomePage: boolean;
  isAboutPage: boolean;
  /** The shop, which shares the about view but drops the name header and
   *  pushes the moon back on phones */
  isArtifactsPage: boolean;
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
            the whole view there and read a touch loud at full strength.
            Both views keep their stars: mesh view's ground is dark too,
            and off the landing page the star field is what draws the
            "andrewhunt" header. */}
        <StarField
          isLanding={isLanding}
          isArtifactsPage={isArtifactsPage}
          opacityTarget={isLanding ? LANDING_STAR_OPACITY : 1}
        />
        {/* The corner "hunt.codes" medallion rides the star canvas rather
            than bringing its own WebGL context (three contexts tripped
            Chrome's per-domain cap and strobed the stars). Hidden on
            /home, where the scene switches dock in its corner (App.scss's
            `body.on-home`) and day mode gives it to the Golden Gate
            Bridge anyway. */}
        {!isHomePage && (
          <BadgeBoundary>
            <Suspense fallback={null}>
              <BadgeMedallion isLanding={isLanding} />
            </Suspense>
          </BadgeBoundary>
        )}
        {/* The coin takes the wire skin in mesh view, so this canvas
            needs its own driver to flip its materials (the solar scene's
            only walks its own scene graph). Both advance one shared,
            clock-based fade. */}
        <WireDriver meshView={!isSpaceView} />
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
                  : isArtifactsPage
                    ? "artifacts"
                    : isAboutPage
                      ? "about"
                      : isProjectsPage
                        ? "projects"
                        : "home"
          }
          isSpaceView={isSpaceView}
          isArtifactsPage={isArtifactsPage}
          onNavigate={onJourneyNavigate}
        />
      )}
    </>
  );
};

// memo matters here: AppBackground re-renders every 200ms for the title
// ticker, and this keeps the whole R3F tree out of that loop
export default memo(Space3DBackground);
