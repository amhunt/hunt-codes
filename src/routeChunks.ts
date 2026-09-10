import { lazy } from "react";

import { preloadBadgeConfetti } from "./badgeConfetti";

/**
 * Route components as their own async chunks, plus the idle warm-up that
 * makes navigating to them feel instant anyway.
 *
 * Every route used to be a static import in App.tsx, so the landing page
 * downloaded and parsed Resume, the shop, the synth, the SVG generator and
 * the rest before it could draw the sun. Splitting them costs a network
 * round trip on the first navigation — which is what `prefetchRoutes`
 * buys back: once the first page has settled we pull the others in during
 * idle time, so the chunk is already in memory by the time anyone clicks.
 *
 * Landing is deliberately NOT here. It is the first paint on `/`; putting
 * it behind a lazy boundary would add a chunk round trip to the one route
 * that can least afford it.
 *
 * The thunks are shared between `lazy()` and the prefetch on purpose:
 * rspack keys a chunk by its `import()` specifier, so warming the chunk
 * only works if both call sites name the module identically. Inlining a
 * second `import("./Home")` elsewhere would still resolve to the same
 * chunk, but going through one table keeps that guarantee visible.
 */
const chunks = {
  home: () => import("./Home"),
  resume: () => import("./Resume"),
  shop: () => import("./Shop"),
  projectsAndToys: () => import("./ProjectsAndToys"),
  svgGenerator: () => import("./SvgGenerator"),
  synth: () => import("./Synth"),
  journey: () => import("./Journey"),
  notFound: () => import("./NotFound"),
};

export const Home = lazy(chunks.home);
export const Resume = lazy(chunks.resume);
export const Shop = lazy(chunks.shop);
export const ProjectsAndToys = lazy(chunks.projectsAndToys);
export const SvgGenerator = lazy(chunks.svgGenerator);
export const Synth = lazy(chunks.synth);
export const Journey = lazy(chunks.journey);
export const NotFound = lazy(chunks.notFound);

/**
 * Warm order, most-likely-next first: the landing sun is an ENTER button
 * to /home, and /about is the link people follow from there. The tail is
 * just "everything else, eventually".
 */
const WARM_ORDER: Array<() => Promise<unknown>> = [
  chunks.home,
  chunks.resume,
  chunks.shop,
  chunks.projectsAndToys,
  chunks.svgGenerator,
  chunks.synth,
  chunks.journey,
  chunks.notFound,
];

const onIdle = (fn: () => void) => {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(fn, { timeout: 2000 });
    return;
  }
  window.setTimeout(fn, 200);
};

let started = false;

/**
 * Pull the route chunks (and the celebration engine behind the corner
 * coin) in after the first page is done loading.
 *
 * Sequential rather than all at once, one idle callback apiece: a phone
 * on 4G is still finishing the 3D chunk and its textures when this
 * starts, and eight parallel chunk requests would take bandwidth from the
 * page the visitor is actually looking at. Evaluating each module also
 * costs main-thread time, so spreading them keeps it off any one frame.
 */
export const prefetchRoutes = () => {
  if (started) return;
  started = true;

  const pump = (i: number) => {
    if (i >= WARM_ORDER.length) {
      // The coin's confetti is the other thing that stalls on first use:
      // three chunks of particle engine plus the signature SVG. BadgeLink
      // already warms it on hover, but a click that lands with the hover
      // (or a tap, which has no hover at all) still waits on the network.
      onIdle(() => preloadBadgeConfetti());
      return;
    }
    onIdle(() => {
      void WARM_ORDER[i]()
        .catch(() => {
          // A failed warm-up is not a failure: React.lazy will just fetch
          // the chunk for real when the route is actually visited.
        })
        .finally(() => pump(i + 1));
    });
  };

  pump(0);
};
