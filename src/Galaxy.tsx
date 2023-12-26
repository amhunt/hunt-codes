import React from "react";
import cx from 'classnames';
import { useLocation } from "react-router-dom";

const Galaxy = () => {

  const location = useLocation();
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
      }}
    >
      <div className={ cx("planet","planet1",location.pathname.includes('resume') && 'planet1_darkened' )} />
    </div>
  );
};

export default Galaxy;
