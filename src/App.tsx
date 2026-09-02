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
import Journey from "./Journey";
import NotFound from "./NotFound";
import ProjectsAndToys from "./ProjectsAndToys";
import Resume from "./Resume";
import RocketCockpit from "./RocketCockpit";
import Shop from "./Shop";
import Synth from "./Synth";
import SvgGenerator from "./SvgGenerator";
import AppBackground from "AppBackground";
import BadgeLink from "BadgeLink";
import DayNightSwitch from "DayNightSwitch";
import Landing from "Landing";
import SpaceJamSwitch from "SpaceJamSwitch";
import { NOT_FOUND_TITLE, ROUTE_TITLES, SITE_ORIGIN } from "./routes";

// Pause audio when the page is hidden; resume on return whatever was
// playing. Every <audio> is covered — the space-jam track (mounted
// app-wide once switched on) and /journey's soundtrack can both be up at
// once. The set lives in a ref (not a plain `let`) so it survives
// re-renders — otherwise the "was playing" state would reset every render
// and playback would never resume.
const usePauseAudioOnHideEventListener = () => {
  const playingOnHide = useRef(new Set<HTMLAudioElement>());

  useEffect(() => {
    const handleVisibilityChange = () => {
      const wasPlaying = playingOnHide.current;
      if (document.hidden) {
        wasPlaying.clear();
        document.querySelectorAll("audio").forEach((audio) => {
          if (audio.paused) return;
          wasPlaying.add(audio);
          audio.pause();
        });
      } else {
        // Playback can still be denied by autoplay policies — the visible
        // controls remain the fallback
        wasPlaying.forEach((audio) => {
          if (audio.isConnected) void audio.play().catch(() => {});
        });
        wasPlaying.clear();
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

// The static index.html head serves every route of the SPA; keep the tab
// title and canonical URL in sync as the visitor navigates (titles come
// from routes.ts, the same list the sitemap is generated from)
const RouteMeta = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title =
      ROUTE_TITLES[pathname] ??
      // Drawing permalinks (/draw/:id) share the studio's title
      (pathname.startsWith("/draw/") ? ROUTE_TITLES["/draw"] : NOT_FOUND_TITLE);
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute(
        "href",
        `${SITE_ORIGIN}${pathname === "/" ? "/" : pathname}`,
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
          <Route path="/journey" element={<Journey />} />
          <Route path="/draw" element={<SvgGenerator />} />
          <Route path="/draw/:id" element={<SvgGenerator />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/projects-and-toys" element={<ProjectsAndToys />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* Fixed corner chrome sits after the routes so each page's own
            content — the landing's ENTER sun — comes first in the tab
            order. The "Space jam" switch rides every page, the landing
            included: the site starts muted, so the landing is where
            visitors look for the music; mounted once, app-wide, the track
            carries across routes. */}
        <SpaceJamSwitch />
        <BadgeLink isNightMode={isNightMode} />
        {/* App-level so the windshield frame and warp flash survive the
            rides' mid-flight route hops (/home → /journey → /home) —
            per-page mounts cut the flash short at every navigation */}
        <RocketCockpit />
      </Router>
    </div>
  );
};

export default App;
