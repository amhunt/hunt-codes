import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import cx from "classnames";
import { Moon, Sun } from "react-feather";
import "./App.scss";

import Home from "./Home";
import Resume from "./Resume";
import SvgGenerator from "./SvgGenerator";
import AppBackground from "AppBackground";
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
    console.log("bro what r u doing in the console...");
    setTimeout(() => setShowBridge(true), 1500);
  }, []);

  return (
    <div className={cx("App", isNightMode ? "night" : "day")}>
      <Router>
        <AppBackground showBridge={showBridge} isNightMode={isNightMode} />
        <button
          aria-label={
            isNightMode ? "Switch to day mode" : "Switch to night mode"
          }
          onClick={() => setIsNightMode((mode) => !mode)}
          className={cx(
            "fixed z-[5000] top-4 right-4 flex items-center justify-center w-12 h-12 p-2 rounded-full transition-colors hover:bg-[#5efffc57]",
            isNightMode ? "text-[#9e80f9]" : "text-[#412596]",
          )}
        >
          {isNightMode ? <Moon /> : <Sun />}
        </button>
        <Switch>
          <Route exact path="/">
            <Landing />
          </Route>
          <Route path="/home">
            <Home />
          </Route>
          <Route path="/about">
            <Resume />
          </Route>
          <Route path="/draw">
            <SvgGenerator />
          </Route>
        </Switch>
      </Router>
    </div>
  );
};

export default App;
