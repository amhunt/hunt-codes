import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import "./App.scss";

import Galaxy from "./Galaxy";

import GoldenGate from "./gg-bridge.png";

// Needed to get hover state on individual chars
const andrewHunt = "andrewhunt";
const nameArr: string[] = [];
for (let c of andrewHunt) {
  nameArr.push(c);
}

const AppBg = ({ showBridge }: { showBridge: boolean }) => {
  const location = useLocation();

  const isNightMode = location.pathname.includes("about");

  const [highlightedCharIdx, setHighlightedCharIdx] = useState(0);
  const [highlightedCharIdx2, setHighlightedCharIdx2] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setHighlightedCharIdx((highlightedCharIdx + 1) % nameArr.length),
      200
    );

    return () => {
      clearInterval(interval);
    };
  }, [highlightedCharIdx]);

  useEffect(() => {
    const interval2 = setInterval(
      () => setHighlightedCharIdx2((highlightedCharIdx2 + 1) % nameArr.length),
      300
    );
    return () => {
      clearInterval(interval2);
    };
  }, [highlightedCharIdx2]);

  return (
    <>
      <svg
        className="nameTitle"
        viewBox="0 0 100 20"
        xmlns="http://www.w3.org/2000/svg"
        style={
          isNightMode
            ? { opacity: 0.3, fill: "white", pointerEvents: "none" }
            : undefined
        }
      >
        <g y="-1" textLength="100%" alignmentBaseline="hanging" color="#004225">
          {nameArr.map((c, idx) => (
            <text
              key={idx}
              textLength="100%"
              x={idx * 10}
              className={`headerCharacter ${
                highlightedCharIdx === idx ? "highlighted" : ""
              } ${highlightedCharIdx2 === idx ? "highlighted2" : ""}`}
              alignmentBaseline="hanging"
            >
              {c}
            </text>
          ))}
        </g>
      </svg>
      <div
        className={cx(
          "App-background",
          "App-background_day",
          isNightMode ? "off" : "on"
        )}
      />
      <div
        className={cx(
          "App-background",
          "App-background_night",
          isNightMode ? "on" : "off"
        )}
      />
      <Galaxy isNightMode={isNightMode} />
      <div className="h-screen">
        <img
          className={`App-gg-bridge ${
            showBridge ? "App-gg-bridge-opaque" : ""
          }`}
          src={GoldenGate}
          alt="golden gate bridge"
        />
      </div>
    </>
  );
};

export default AppBg;
