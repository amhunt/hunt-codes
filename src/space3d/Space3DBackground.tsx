import React, { memo } from "react";

import SpaceCanvas from "./SpaceCanvas";
import StarField from "./StarField";
import Moon3D from "./Moon3D";
import SolarScene from "./solar/SolarScene";

/**
 * Entry point for the WebGL background (lazy-loaded so three.js ships as
 * its own chunk). Two canvases:
 *
 * - SpaceCanvas: the orthographic pixel-space layer (GPU stars, the moon
 *   glued to its SVG). Mounted on every route.
 * - SolarScene: the perspective solar system (hunt-codes-3's scene — sun,
 *   orbiting planets, camera rig). Mounted on the landing + home routes;
 *   the camera swoops between the top-down landing view and the
 *   Earth-perch home view, and the sun's DOM rings follow the projection.
 *
 * Scenes hide themselves when their DOM anchor is absent, and StarField
 * gates its layers invisible once fully faded, so a day-mode canvas
 * draws almost nothing.
 */

const Space3DBackground = ({
  isNightMode,
  isLanding,
  isHomePage,
}: {
  isNightMode: boolean;
  isLanding: boolean;
  isHomePage: boolean;
}) => {
  return (
    <>
      <SpaceCanvas>
        <StarField isLanding={isLanding} opacityTarget={isNightMode ? 1 : 0} />
        {/* Moon3D tracks the #moon-svg element and hides itself while the
            element is absent (landing/home pages, day mode) */}
        <Moon3D />
      </SpaceCanvas>
      {(isLanding || isHomePage) && (
        <SolarScene
          view={isLanding ? "landing" : "home"}
          isNightMode={isNightMode}
        />
      )}
    </>
  );
};

// memo matters here: AppBackground re-renders every 200ms for the title
// ticker, and this keeps the whole R3F tree out of that loop
export default memo(Space3DBackground);
