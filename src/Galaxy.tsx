import React, { useState } from "react";
import cx from "classnames";

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
      />
      <div
        className={cx(
          "planet1",
          "planet1_night",
          !hasMounted ? "unmounted" : isNightMode ? "on" : "off"
        )}
      />
    </div>
  );
};

export default React.memo(Galaxy);
