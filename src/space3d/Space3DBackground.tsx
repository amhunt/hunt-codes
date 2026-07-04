import React, { memo } from "react";

import SpaceCanvas from "./SpaceCanvas";
import StarField from "./StarField";
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

const Space3DBackground = ({
  isNightMode,
  isLanding,
  isHomePage,
  isAboutPage,
}: {
  isNightMode: boolean;
  isLanding: boolean;
  isHomePage: boolean;
  isAboutPage: boolean;
}) => {
  return (
    <>
      <SpaceCanvas>
        <StarField isLanding={isLanding} opacityTarget={isNightMode ? 1 : 0} />
      </SpaceCanvas>
      {(isLanding || isHomePage || isAboutPage) && (
        <SolarScene
          view={isLanding ? "landing" : isAboutPage ? "about" : "home"}
          isNightMode={isNightMode}
        />
      )}
    </>
  );
};

// memo matters here: AppBackground re-renders every 200ms for the title
// ticker, and this keeps the whole R3F tree out of that loop
export default memo(Space3DBackground);
