import React from "react";

import "./App.css";

const Galaxy = () => {
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
      <div className="planet planet1" />
    </div>
  );
};

export default Galaxy;
