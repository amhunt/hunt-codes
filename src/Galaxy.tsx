import React, { useEffect, useState } from "react";
import cx from "classnames";
import MoonSvg from "./MoonSvg";
import SunSvg from "./SunSvg";

const Galaxy = ({ isNightMode }: { isNightMode: boolean }) => {
  const [hasMounted, setHasMounted] = useState(false);
  const [hideMoon, setHideMoon] = useState(!isNightMode);
  const [hideSun, setHideSun] = useState(isNightMode);

  // hideMoon hides moon after a second, to allow the animation to finish
  // before the moon stops being rendered. It uses isNightMode to determine
  // whether to hide the moon or not.
  useEffect(() => {
    setTimeout(() => setHideMoon(!isNightMode), 1000);
    setTimeout(() => setHideSun(isNightMode), 1000);
  }, [isNightMode]);

  useEffect(() => {
    setTimeout(() => setHasMounted(true), 1000);
  }, []);

  return (
    <div className="planet-container">
      {!hideSun && (
        <div
          className={cx(
            "planet1",
            "planet1_day",
            hasMounted && (!isNightMode ? "on" : "off")
          )}
        >
          <SunSvg isHome />
        </div>
      )}
      {!hideMoon && (
        <div
          className={cx(
            "planet1",
            "planet1_night",
            !hasMounted ? "unmounted" : isNightMode ? "on" : "off"
          )}
        >
          <MoonSvg />
        </div>
      )}
    </div>
  );
};

export default React.memo(Galaxy);
