import React, { memo, useEffect, useState } from "react";

import SpaceCanvas from "./SpaceCanvas";
import StarField from "./StarField";
import Moon3D from "./Moon3D";
import SolarSystem3D from "./SolarSystem3D";

/**
 * Entry point for the WebGL background (lazy-loaded so three.js ships as
 * its own chunk). Mounts the shared canvas only while there is something
 * to draw: night mode, or the ~1s fade/set choreography after switching
 * back to day. New render-heavy scenes plug in here as children of
 * SpaceCanvas.
 */

// Covers the 0.6s star fade-out plus the 1s moon "set" animation
const UNMOUNT_DELAY_MS = 1300;

const Space3DBackground = ({
  isNightMode,
  isLanding,
}: {
  isNightMode: boolean;
  isLanding: boolean;
}) => {
  const [mounted, setMounted] = useState(isNightMode);

  useEffect(() => {
    if (isNightMode) {
      setMounted(true);
      return;
    }
    const timeout = setTimeout(() => setMounted(false), UNMOUNT_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [isNightMode]);

  if (!mounted) return null;

  return (
    <SpaceCanvas>
      <StarField isLanding={isLanding} opacityTarget={isNightMode ? 1 : 0} />
      {/* Moon3D tracks the #moon-svg element and hides itself while the
          element is absent (landing page, day mode) */}
      <Moon3D />
      {isLanding && <SolarSystem3D />}
    </SpaceCanvas>
  );
};

// memo matters here: AppBackground re-renders every 200ms for the title
// ticker, and this keeps the whole R3F tree out of that loop
export default memo(Space3DBackground);
