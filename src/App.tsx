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
  prefetchRoutes,
} from "./routeChunks";
import AppBackground from "AppBackground";
import BadgeLink from "BadgeLink";
import Landing from "Landing";
import SpaceJamSwitch from "SpaceJamSwitch";
import ViewModeSwitch from "ViewModeSwitch";
import { installClickTracking, trackPageView } from "./analytics";
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
    // After the title, so GA files the view under the right page name
    trackPageView(pathname);
  }, [pathname]);
  return null;
};

/** Remembers the visitor's own pick between the two scene views */
/** Long enough to read a sentence that explains itself, rather than the
 *  library's 4s, which suits "Saved!" and not much else */
const TOAST_DURATION_MS = 7000;

const VIEW_STORAGE_KEY = "hunt-codes-scene-view";

/**
 * The scene-view tour: the landing page always opens in space view (its
 * stars-then-sun intro is choreographed for the photographed scene), the
 * trip in to /home flips the scene to mesh — a free demo of the corner
 * switch — and the trip back returns it to space. Each step is a route
 * hop, from → to. The tour stops the moment the visitor works the switch
 * themselves (App's `userPickedView`): from then on their pick holds
 * across every route until the next full load.
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

const App = () => {
  const [showBridge, setShowBridge] = useState(false);
  // The landing page always opens in space view (see VIEW_TOUR). Any
  // other entry point opens in the view the visitor last picked for
  // themselves, remembered across visits: a chosen view that resets on
  // every reload reads as a bug. (Same guarded read as the drawing
  // studio's: storage throws outright in a browser set to block site
  // data.)
  const [isSpaceView, setIsSpaceView] = useState(() => {
    if (window.location.pathname === "/") return true;
    try {
      return window.localStorage.getItem(VIEW_STORAGE_KEY) !== "mesh";
    } catch {
      return true;
    }
  });
  // Whether the visitor has worked the switch this session — which ends
  // the tour's automatic flips and is the only pick worth remembering
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

  const isSynthRoute = window.location.pathname === "/synth";

  // Tint the mobile browser chrome (iOS Safari tab bar, Android status
  // bar) to match the active view; mesh matches the top of the
  // App-background_mesh ground
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isSpaceView ? "#000000" : "#050f22");
  }, [isSpaceView]);

  // fade home content in once mounted
  useEffect(() => {
    // eslint-disable-next-line no-console -- intentional easter egg
    console.log("bro what r u doing in the console...");
    const timer = setTimeout(() => setShowBridge(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Warm the other routes' chunks once this one has finished loading —
  // after `load`, not on mount, so the prefetch never competes with the
  // 3D chunk and its textures for a phone's bandwidth.
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
            <Route path="/artifacts" element={<Shop />} />
            {/* The shop lived at /shop until it was renamed; keep the old
                path working for anyone holding that link */}
            <Route
              path="/shop"
              element={<Navigate to="/artifacts" replace />}
            />
            <Route path="/projects-and-toys" element={<ProjectsAndToys />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        {/* Fixed corner chrome sits after the routes so each page's own
            content — the landing's ENTER sun — comes first in the tab
            order. The "Space jam" switch rides every page, the landing
            included: the site starts muted, so the landing is where
            visitors look for the music; mounted once, app-wide, the track
            carries across routes. */}
        {isSynthRoute ? null : <SpaceJamSwitch />}
        <BadgeLink isSpaceView={isSpaceView} />
        {/* App-level so the windshield frame and warp flash survive the
            rides' mid-flight route hops (/home → /journey → /home) —
            per-page mounts cut the flash short at every navigation */}
        <RocketCockpit />
        {/* Bottom centre, clear of the music switch (bottom-left) and the
            coin (bottom-right). Dressed like the tooltips — the site's
            surfaces are dark, and the library's default is a white card. */}
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
    </div>
  );
};

export default App;
