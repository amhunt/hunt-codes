import React, { useState, useEffect, useRef, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import cx from "classnames";
import { Toaster } from "react-hot-toast";
import "./App.scss";

import RocketCockpit from "./RocketCockpit";
import {
  Home,
  Journey,
  NotFound,
  ProjectsAndToys,
  Resume,
  Shop,
  Synth,
  SvgGenerator,
  SvgTo3d,
  prefetchRoutes,
} from "./routeChunks";
import AppBackground from "AppBackground";
import BadgeLink from "BadgeLink";
import Landing from "Landing";
import SpaceJamSwitch from "SpaceJamSwitch";
import ViewModeSwitch from "ViewModeSwitch";
import { installClickTracking, trackPageView } from "./analytics";
import { TooltipProvider, TOOLTIP_DELAY_MS } from "ui/tooltip";
import { NOT_FOUND_TITLE, ROUTE_TITLES, SITE_ORIGIN } from "./routes";

// Pause audio when the page is hidden; resume whatever was playing. The
// set lives in a ref (not a plain `let`) so it survives re-renders —
// otherwise "was playing" would reset and playback would never resume.
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
        // Autoplay policy can still deny this — the visible controls are
        // the fallback
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

// One static index.html head serves every route, so keep the tab title
// and canonical URL in sync as the visitor navigates (titles from
// routes.ts, the same list the sitemap comes from)
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
    // After the title, so GA files the view under the right page name
    trackPageView(pathname);
  }, [pathname]);
  return null;
};

/** Long enough to read a sentence, rather than the library's 4s — which
 *  suits "Saved!" and not much else */
const TOAST_DURATION_MS = 7000;

const VIEW_STORAGE_KEY = "hunt-codes-scene-view";

/** How long after a tooltip closes the next still opens instantly.
 *  Radix's own default, named because the single root provider makes it
 *  matter site-wide — it's what lets a row of controls sweep as a group. */
const TOOLTIP_SKIP_DELAY_MS = 300;

/**
 * The scene-view tour. The landing always opens in space (its
 * stars-then-sun intro is choreographed for it); the hop in to /home
 * flips to mesh as a free demo of the corner switch, and the hop back
 * returns it. The tour stops the moment the visitor works the switch
 * themselves, after which their pick holds until the next full load.
 */
const VIEW_TOUR: { from: string; to: string; space: boolean }[] = [
  { from: "/", to: "/home", space: false },
  { from: "/home", to: "/", space: true },
];

const ViewTour = ({
  enabled,
  onView,
}: {
  enabled: boolean;
  onView: (isSpace: boolean) => void;
}) => {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    const from = previous.current;
    previous.current = pathname;
    if (!enabled || from === pathname) return;
    const step = VIEW_TOUR.find((s) => s.from === from && s.to === pathname);
    if (step) onView(step.space);
  }, [pathname, enabled, onView]);
  return null;
};

/** The music switch rides every page but /synth, which brings its own
 *  audio. Inside the Router so the rule is re-checked on navigation —
 *  off `window.location` it was only right on a fresh load. */
const RoutedMusicSwitch = () => {
  const { pathname } = useLocation();
  return pathname === "/synth" ? null : <SpaceJamSwitch />;
};

const App = () => {
  const [showBridge, setShowBridge] = useState(false);
  // The landing always opens in space (VIEW_TOUR); every other entry
  // point opens in the view last picked, remembered across visits — a
  // chosen view that resets on reload reads as a bug. Guarded because
  // storage throws outright in a browser set to block site data.
  const [isSpaceView, setIsSpaceView] = useState(() => {
    if (window.location.pathname === "/") return true;
    try {
      return window.localStorage.getItem(VIEW_STORAGE_KEY) !== "mesh";
    } catch {
      return true;
    }
  });
  // Ends the tour's automatic flips, and is the only pick worth keeping
  const [userPickedView, setUserPickedView] = useState(false);
  const pickView = (isSpace: boolean) => {
    setUserPickedView(true);
    setIsSpaceView(isSpace);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, isSpace ? "space" : "mesh");
    } catch {
      // A browser blocking site data just means the view won't persist
    }
  };

  usePauseAudioOnHideEventListener();
  useEffect(installClickTracking, []);

  // Tint the mobile browser chrome to match the active view; mesh
  // matches the top of the App-background_mesh ground
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isSpaceView ? "#000000" : "#050f22");
  }, [isSpaceView]);

  useEffect(() => {
    // eslint-disable-next-line no-console -- intentional easter egg
    console.log("bro what r u doing in the console...");
    const timer = setTimeout(() => setShowBridge(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Warm the other routes' chunks after `load`, not on mount, so the
  // prefetch never competes with the 3D chunk and its textures for a
  // phone's bandwidth.
  useEffect(() => {
    if (document.readyState === "complete") {
      prefetchRoutes();
      return;
    }
    window.addEventListener("load", prefetchRoutes, { once: true });
    return () => window.removeEventListener("load", prefetchRoutes);
  }, []);

  return (
    <div className={cx("App", isSpaceView ? "space" : "mesh")}>
      {/* The site's one tooltip provider. Radix scopes its open/close
          grace to a provider, so one per tooltip (as this used to be)
          made each an island that re-served the full delay. */}
      <TooltipProvider
        delayDuration={TOOLTIP_DELAY_MS}
        skipDelayDuration={TOOLTIP_SKIP_DELAY_MS}
      >
        <Router>
          <RouteMeta />
          <ViewTour enabled={!userPickedView} onView={setIsSpaceView} />
          <AppBackground showBridge={showBridge} isSpaceView={isSpaceView} />
          <ViewModeSwitch isSpaceView={isSpaceView} onChange={pickView} />
          {/* Every route but the landing is its own chunk (routeChunks.ts),
            so `/` no longer parses the résumé, the shop and the synth
            before it can draw the sun. `null` is the right fallback: the
            solar system and the corner chrome are mounted outside this
            boundary and keep rendering, so a warmed chunk swaps in with
            no flash — and routeChunks prefetches the others during idle
            time, so by the time anyone navigates there is nothing to
            wait for. */}
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/home" element={<Home />} />
              <Route path="/about" element={<Resume />} />
              <Route path="/synth" element={<Synth />} />
              <Route path="/journey" element={<Journey />} />
              <Route path="/draw" element={<SvgGenerator />} />
              <Route path="/draw/:id" element={<SvgGenerator />} />
              <Route path="/svg-to-3d" element={<SvgTo3d />} />
              <Route path="/artifacts" element={<Shop />} />
              {/* The shop lived at /shop until it was renamed */}
              <Route
                path="/shop"
                element={<Navigate to="/artifacts" replace />}
              />
              <Route path="/projects-and-toys" element={<ProjectsAndToys />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          {/* Corner chrome sits after the routes so each page's own content
            comes first in the tab order. The music switch is mounted once
            so the track carries across routes. */}
          <RoutedMusicSwitch />
          <BadgeLink />
          {/* App-level so the windshield frame and warp flash survive the
            rides' mid-flight route hops — a per-page mount would cut the
            flash short at every navigation */}
          <RocketCockpit />
          {/* Bottom centre, clear of the music switch and the coin. Dressed
            like the tooltips — the library's default is a white card. */}
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: TOAST_DURATION_MS,
              style: {
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                fontSize: "0.75rem",
                maxWidth: "32rem",
              },
            }}
          />
        </Router>
      </TooltipProvider>
    </div>
  );
};

export default App;
