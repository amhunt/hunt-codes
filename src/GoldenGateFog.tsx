import React from "react";
import cx from "classnames";

/**
 * Karl the Fog rolling over the Golden Gate bridge on the home page.
 * Two CSS-only fog banks drift leftward at different speeds for parallax:
 * the back bank sits behind the bridge (z 3 < bridge's 4) so the towers
 * poke out of it, the front wisps pass in front (z 5). Each bank is a
 * 200%-wide strip of repeating radial-gradient blobs translated by
 * exactly one tile per loop, so the drift never jumps.
 *
 * The layers are siblings (not wrapped) so each keeps its own z-index
 * relative to the bridge img; both are pointer-events: none.
 */
const GoldenGateFog = ({ visible }: { visible: boolean }) => (
  <>
    <div
      aria-hidden="true"
      className={cx("gg-fog-layer", "gg-fog-back", visible && "on")}
    >
      <div className="gg-fog-drift" />
    </div>
    <div
      aria-hidden="true"
      className={cx("gg-fog-layer", "gg-fog-front", visible && "on")}
    >
      <div className="gg-fog-drift" />
    </div>
  </>
);

export default React.memo(GoldenGateFog);
