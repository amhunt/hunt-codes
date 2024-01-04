import React, { useState } from "react";
import cx from "classnames";
import Moon from "./MoonSvg";
import Sun from "./SunSvg";

const Galaxy = ({ isNightMode }: { isNightMode: boolean }) => {
  const [hasMounted, setHasMounted] = useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <div className="planet-container">
      <div
        className={cx(
          "planet1",
          "planet1_day",
          hasMounted && (!isNightMode ? "on" : "off")
        )}
      >
        <Sun />
      </div>
      <div
        className={cx(
          "planet1",
          "planet1_night",
          !hasMounted ? "unmounted" : isNightMode ? "on" : "off"
        )}
      >
        <Moon />
      </div>
    </div>
  );
};

export default React.memo(Galaxy);
