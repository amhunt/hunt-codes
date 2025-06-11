import React, { useState, useEffect, memo } from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import "./App.scss";
import "./computer.scss";

import Galaxy from "./Galaxy";

import GoldenGate from "./gg-bridge.png";
import useWindowSize from "useWindowSize";
import { Music } from "react-feather";
// import RetroMac from "./RetroMac";
import Stars from "Stars";

// Needed to get hover state on individual chars
const andrewHunt = "andrewhunt";
const nameArr: string[] = [];
for (let c of andrewHunt) {
  nameArr.push(c);
}

const AppBackground = ({ showBridge }: { showBridge: boolean }) => {
  const size = useWindowSize();
  const location = useLocation();

  const isNightMode = !location.pathname.includes("home");
  const isHomePage = location.pathname.includes("home");
  const isLanding = location.pathname === "/" || location.pathname === "";
  const [musicEnabled, setMusicEnabled] = useState(false);

  const [highlightedCharIdx, setHighlightedCharIdx] = useState(0);

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
    if (isNightMode) {
      setTimeout(() => setMusicEnabled(true), 4000);
    }
  }, [isNightMode]);

  return (
    <>
      {musicEnabled ? (
        <audio
          controlsList="nodownload"
          autoPlay
          loop
          className={cx(
            "z-[10000] fixed bottom-4 left-4",
            isNightMode && "nightmode"
          )}
          controls
        >
          <source src="analog.wav" />
        </audio>
      ) : (
        <button className="fixed z-[5000] bottom-4 left-4 flex transition-colors items-center justify-center w-12 h-12 p-2 rounded-full hover:bg-[#5efffc57]">
          <Music onClick={() => setMusicEnabled(true)} />
        </button>
      )}
      {!isLanding && (
        <svg
          className={cx(
            "nameTitle",
            isNightMode
              ? "opacity-30 pointer-events-none fill-white night"
              : "fill-[#004225] opacity-75"
          )}
          viewBox={size === "lg" ? "0 0 200 20" : "0 0 100 20"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <text textLength="100%" color="#004225">
            {nameArr.map((c, idx) => (
              <tspan
                key={idx}
                className={cx(
                  highlightedCharIdx === idx &&
                    (isNightMode
                      ? "highlightedChar_night"
                      : "highlightedChar_day"),
                  c === "h" ? "z-10" : "z-0"
                )}
                alignmentBaseline="hanging"
              >
                {c}
              </tspan>
            ))}
          </text>
        </svg>
      )}
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
        {isNightMode && <Stars isLanding={isLanding} />}
      </div>
      {!isLanding && <Galaxy isNightMode={isNightMode} />}
      {isHomePage && (
        <>
          {/* <RetroMac /> */}
          <img
            className={`App-gg-bridge ${
              showBridge && !isNightMode ? "App-gg-bridge-opaque" : ""
            }`}
            src={GoldenGate}
            alt="golden gate bridge"
          />
        </>
      )}
    </>
  );
};

export default memo(AppBackground);
