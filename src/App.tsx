import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import cx from "classnames";
import "./App.scss";

import Home from "./Home";
import Resume from "./Resume";
import Synth from "./Synth";
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

const DEFAULT_TITLE = "Andrew Hunt - Frontend Engineer | New York";
const ROUTE_TITLES: Record<string, string> = {
  "/": DEFAULT_TITLE,
  "/home": DEFAULT_TITLE,
  "/about": "About Me | Andrew Hunt",
  "/draw": "SVG Studio | Andrew Hunt",
};

// The static index.html head serves every route of the SPA; keep the tab
// title and canonical URL in sync as the visitor navigates
const RouteMeta = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = ROUTE_TITLES[pathname] ?? DEFAULT_TITLE;
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute(
        "href",
        `https://www.hunt.codes${pathname === "/" ? "/" : pathname}`,
      );
  }, [pathname]);
  return null;
};

const App = () => {
  const [showBridge, setShowBridge] = useState(false);
  // The whole app is night until the visitor flips the moon/sun switch
  const [isNightMode, setIsNightMode] = useState(true);

  usePauseAudioOnHideEventListener();

  // Tint the mobile browser chrome (iOS Safari tab bar, Android status
  // bar) to match the active palette; day matches the top of the
  // App-background_day gradient
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isNightMode ? "#000000" : "#ffc2d9");
  }, [isNightMode]);

  // fade home content in once mounted
  useEffect(() => {
    // eslint-disable-next-line no-console -- intentional easter egg
    console.log("bro what r u doing in the console...");
    const timer = setTimeout(() => setShowBridge(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cx("App", isNightMode ? "night" : "day")}>
      <Router>
        <RouteMeta />
        <AppBackground showBridge={showBridge} isNightMode={isNightMode} />
        <DayNightSwitch
          isNightMode={isNightMode}
          onCheckedChange={setIsNightMode}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<Resume />} />
          <Route path="/synth" element={<Synth />} />
          <Route path="/draw" element={<SvgGenerator />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
