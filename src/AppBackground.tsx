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

const stars = Array.from({ length: 200 }, () => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  r: Math.random() * 2,
  animationDelay: `${Math.random() * 4000}ms`,
}));

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
        className={cx(
          "nameTitle",
          isNightMode
            ? "opacity-30 pointer-events-none fill-white night"
            : "fill-[#004225] opacity-75"
        )}
        viewBox="0 0 100 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g y="-1" textLength="100%" alignmentBaseline="hanging" color="#004225">
          {nameArr.map((c, idx) => (
            <text
              key={idx}
              textLength="100%"
              x={idx * 10}
              className={cx(
                "headerCharacter",
                highlightedCharIdx === idx && "highlighted",
                highlightedCharIdx2 === idx && "highlighted2",
                c === "h" ? "z-10" : "z-0"
              )}
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
      >
        {stars.map((star, i) => (
          <div
            key={i}
            className={cx("star", star.r < 0.1 && "star_disco")}
            style={{
              left: star.x,
              top: star.y,
              width: star.r,
              height: star.r,
              animationDelay: star.animationDelay,
            }}
          />
        ))}
      </div>
      <Galaxy isNightMode={isNightMode} />
      <div className="h-screen">
        <img
          className={`App-gg-bridge ${
            showBridge && !isNightMode ? "App-gg-bridge-opaque" : ""
          }`}
          src={GoldenGate}
          alt="golden gate bridge"
        />
      </div>

      {isNightMode && (
        <img src="disco" className="absolute left-4 bottom-4 w-8" />
      )}
    </>
  );
};

export default AppBg;
