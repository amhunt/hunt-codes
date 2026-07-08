import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import cx from "classnames";
import "./App.scss";

import Home from "./Home";
import Resume from "./Resume";
import SvgGenerator from "./SvgGenerator";
import AppBackground from "AppBackground";
import DayNightSwitch from "DayNightSwitch";
import Landing from "Landing";

// Needed to get hover state on individual chars
const andrewHunt = "andrewhunt";
const nameArr: string[] = [];
for (const c of andrewHunt) {
  nameArr.push(c);
}

// Pause audio when page is hidden via visibilitychange event listener
const usePauseAudioOnHideEventListener = () => {
  let playingOnHide = false;

  const handleVisibilityChange = useCallback(() => {
    const audio = document.querySelector("audio");
    if (!audio) return;
    if (document.hidden) {
      playingOnHide = !audio.paused;
      audio.pause();
    } else if (playingOnHide) {
      // Page became visible again - resume playing if audio was "playing on hide"
      // eslint-disable-next-line -- TODO: rm this comment and fix the lint error
      audio.play();
    }
  }, []);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange, {
      passive: true,
    });
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
};

const App = () => {
  const [showBridge, setShowBridge] = useState(false);
  // The whole app is night until the visitor flips the moon/sun switch
  const [isNightMode, setIsNightMode] = useState(true);

  usePauseAudioOnHideEventListener();

  // fade home content in once mounted
  useEffect(() => {
    // eslint-disable-next-line -- TODO: rm this comment and fix the lint error
    console.log("bro what r u doing in the console...");
    setTimeout(() => setShowBridge(true), 1500);
  }, []);

  return (
    <div className={cx("App", isNightMode ? "night" : "day")}>
      <Router>
        <AppBackground showBridge={showBridge} isNightMode={isNightMode} />
        <DayNightSwitch
          isNightMode={isNightMode}
          onCheckedChange={setIsNightMode}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<Resume />} />
          <Route path="/draw" element={<SvgGenerator />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
