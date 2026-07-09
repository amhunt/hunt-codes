import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import cx from "classnames";
import "./App.scss";

import Home from "./Home";
import Resume from "./Resume";
import SvgGenerator from "./SvgGenerator";
import AppBackground from "AppBackground";
import DayNightSwitch from "DayNightSwitch";
import Landing from "Landing";

// Pause audio when the page is hidden; resume on return if it was playing.
// The flag lives in a ref (not a plain `let`) so it survives re-renders —
// otherwise the "was playing" state would reset every render and playback
// would never resume.
const usePauseAudioOnHideEventListener = () => {
  const playingOnHide = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = document.querySelector("audio");
      if (!audio) return;
      if (document.hidden) {
        playingOnHide.current = !audio.paused;
        audio.pause();
      } else if (playingOnHide.current) {
        // Resume if it was playing when the page was hidden. Playback can
        // still be denied by autoplay policies — the visible controls remain
        // the fallback.
        void audio.play().catch(() => {});
      }
    };
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
    const timer = setTimeout(() => setShowBridge(true), 1500);
    return () => clearTimeout(timer);
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
