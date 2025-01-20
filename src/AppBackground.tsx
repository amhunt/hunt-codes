import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import "./App.scss";
import "./computer.scss";

import Galaxy from "./Galaxy";

import GoldenGate from "./gg-bridge.png";
// import FacePic from "./assets/ah-face-2.png";
import Apple from "./assets/apple-rainbow.svg";
import useWindowSize from "useWindowSize";
import { Music } from "react-feather";

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
  const size = useWindowSize();
  const location = useLocation();

  const isNightMode = location.pathname.includes("about");
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
      <div className="z-20 h-screen">
        <div className="z-20 stage">
          <div className="positioning animated">
            <div className="mac">
              <span className="back"></span>
              <span className="left"></span>
              <span className="right"></span>
              <span className="top"></span>
              <span className="base-front">
                <span className="keyboard-port"></span>
              </span>
              <span className="base-left"></span>
              <span className="base-right"></span>
              <span className="base-back"></span>
              <span className="front">
                <span className="bezel-top"></span>
                <span className="bezel-left"></span>
                <span className="bezel-right"></span>
                <span className="bezel-bottom"></span>
                <span className="screen-container">
                  <span className="screen">
                    {/* img of my face */}
                    {/* <img
                      alt="Picture of Andrew on 3d legacy mac animation"
                      src={FacePic}
                      style={{ aspectRatio: 1 }}
                    /> */}
                    <span
                      id="typed-js"
                      className="typed"
                      aria-label="email address: andrew@hunt.codes"
                    />
                    <span className="sheen" />
                  </span>
                </span>
                <span className="logo">
                  <img src={Apple} className="image" />
                  <span className="text">Andy</span>
                </span>
                <span className="floppy" />
              </span>
            </div>
          </div>
        </div>
        <img
          className={`App-gg-bridge ${
            showBridge && !isNightMode ? "App-gg-bridge-opaque" : ""
          }`}
          src={GoldenGate}
          alt="golden gate bridge"
        />
      </div>
    </>
  );
};

export default AppBg;
