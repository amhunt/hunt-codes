import React, { memo } from "react";

import SpaceCanvas from "./SpaceCanvas";
import StarField from "./StarField";
import Moon3D from "./Moon3D";
import Sun3D from "./Sun3D";
import SolarSystem3D from "./SolarSystem3D";

/**
 * Entry point for the WebGL background (lazy-loaded so three.js ships as
 * its own chunk). The shared canvas stays mounted across every route —
 * Sun3D is one persistent object that flies between the landing and home
 * suns, so unmounting the canvas mid-route-change would break the flight
 * (and the home page needs it for the day sun anyway). Scenes hide
 * themselves when their DOM anchor is absent, and StarField gates its
 * layers invisible once fully faded, so a day-mode canvas draws almost
 * nothing. New render-heavy scenes plug in here as children of
 * SpaceCanvas.
 */

const Space3DBackground = ({
  isNightMode,
  isLanding,
}: {
  isNightMode: boolean;
  isLanding: boolean;
}) => {
  return (
    <SpaceCanvas>
      <StarField isLanding={isLanding} opacityTarget={isNightMode ? 1 : 0} />
      {/* Moon3D tracks the #moon-svg element and hides itself while the
          element is absent (landing page, day mode) */}
      <Moon3D />
      {/* THE sun — glued to whichever sun svg is on screen, flying to the
          new spot when the page changes */}
      <Sun3D isNightMode={isNightMode} />
      {isLanding && <SolarSystem3D />}
    </SpaceCanvas>
  );
};

// memo matters here: AppBackground re-renders every 200ms for the title
// ticker, and this keeps the whole R3F tree out of that loop
export default memo(Space3DBackground);
