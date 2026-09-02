import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";

import CameraRig, { type SolarView } from "./CameraRig";
import Planet from "./Planet";
import Moon from "./Moon";
import Sun from "./Sun";
import Asteroid from "./Asteroid";
import Satellite from "./Satellite";
import DrumPad from "./DrumPad";
import RocketJourney from "./RocketJourney";
import JourneyCruise from "./JourneyCruise";
import SynthSystem from "./SynthSystem";
import SunSvgAnchor from "./SunSvgAnchor";
import BodyAnchors from "./BodyAnchors";
import { ASTEROIDS, layoutState, PLANETS } from "./constants";
import useWindowWidth from "../../useWindowWidth";

/**
 * The perspective solar-system canvas (hunt-codes-3's scene), layered
 * over the pixel-space star canvas and under the page content. Mounted
 * on the landing and home routes; the camera rig swoops between the
 * top-down landing view and the Earth-perch home view.
 *
 * The canvas never takes pointer input — the clickable sun rings are
 * DOM/SVG overlays that SunSvgAnchor glues to the projected sun.
 */

// First landing load plays a staggered reveal: the sun is up immediately,
// the planets fade in at +1s and the "ENTER" ring at +2s. Only the very
// first landing visit runs it — remounts / returning from /home skip
// straight to fully shown so the scene doesn't blink out.
const PLANETS_DELAY_MS = 1000;
const ENTER_DELAY_MS = 2000;
let hasPlayedLandingIntro = false;

const SolarScene = ({
  view,
  isNightMode,
  onNavigate,
}: {
  view: SolarView;
  isNightMode: boolean;
  /** Router navigation for the lightspeed journeys (threaded through the
   *  canvas boundary — router context doesn't cross into R3F) */
  onNavigate: (to: string) => void;
}) => {
  const isLanding = view === "landing";
  // The satellite close-up (/projects-and-toys)
  const isProjects = view === "projects";
  // Below the lg breakpoint the camera switches to its NDC-fraction
  // framing (CameraRig) and the wide-screen body placement stops
  // fitting — the link bodies pull inward (constants.ts `compact`
  // overrides). On phone widths the 808 pad sits out entirely.
  const { width } = useWindowWidth();
  const isCompact = width < 1280;
  const isPhone = width < 768;
  // Below the lg breakpoint (useWindowSize's 1000px) the home view drops
  // its redundant link bodies — they duplicate the icon buttons — so the
  // perch keeps some breathing room. SolarOverlays hides the trio's click
  // targets to match.
  const isNarrow = width < 1000;
  useEffect(() => {
    layoutState.compact = isCompact;
  }, [isCompact]);
  const [planetsRevealed, setPlanetsRevealed] = useState(
    () => hasPlayedLandingIntro || !isLanding,
  );
  const [enterRevealed, setEnterRevealed] = useState(
    () => hasPlayedLandingIntro || !isLanding,
  );

  useEffect(() => {
    if (hasPlayedLandingIntro || !isLanding) {
      setPlanetsRevealed(true);
      setEnterRevealed(true);
      return;
    }
    const planetsTimer = window.setTimeout(
      () => setPlanetsRevealed(true),
      PLANETS_DELAY_MS,
    );
    const enterTimer = window.setTimeout(() => {
      setEnterRevealed(true);
      hasPlayedLandingIntro = true;
    }, ENTER_DELAY_MS);
    return () => {
      window.clearTimeout(planetsTimer);
      window.clearTimeout(enterTimer);
    };
  }, [isLanding]);

  return (
    <Canvas
      className="solar-canvas"
      // pointerEvents MUST be inline: fiber v9 writes an inline
      // pointer-events on its wrapper (same caveat as SpaceCanvas)
      style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
      onCreated={({ gl }) => {
        gl.domElement.style.pointerEvents = "none";
      }}
      camera={{ position: [0, 58, 0.01], fov: 55, near: 0.1, far: 1200 }}
      // Cap DPR at 1.5 (2x on retina was ~78% more pixels for little
      // visible gain); keep MSAA — the sphere limbs do need it
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.14} />
      {/* From the home sun-perch the full glow would fill the frame and
          wash out the stars (and the crisp flare corona) — shrink it to
          hug the limb there */}
      <Sun
        targetGlowScale={view === "home" || isProjects ? 2.2 : 4}
        isNightMode={isNightMode}
        showEnterRing={isLanding}
        enterRevealed={enterRevealed}
      />
      {PLANETS.map((planet) => (
        <Planet
          key={planet.name}
          config={planet}
          // hunt-codes-3's faint white rings, flipped dark for day mode
          orbitColor={isNightMode ? "#ffffff" : "#141428"}
          orbitOpacity={isNightMode ? 0.28 : 0.2}
          isNightMode={isNightMode}
          aboutActive={view === "home"}
          revealed={planetsRevealed}
          closeUp={view === "about"}
        />
      ))}
      {/* The moon is an /about-only body: from the landing's top-down
          framing it reads as a stray speck beside Earth rather than a body
          (and its orbit ring crosses Earth's), and from the home perch it
          only crowds Earth. It fades in on the way to the about perch —
          along the scroll scrub as well as the timed swoop (Moon reads the
          journey progress itself) — where it becomes the video link. */}
      <Moon
        orbitColor={isNightMode ? "#ffffff" : "#141428"}
        orbitOpacity={isNightMode ? 0.28 : 0.2}
        revealed={view === "about"}
        // The video link needs the moon actually on screen AND clickable:
        // /about above phone widths (on phones the panel is full-bleed
        // and Resume doesn't mount the overlay — the moon hides behind
        // the resume)
        linkActive={view === "about" && !isPhone}
      />
      {/* Link bodies — home view only: on landing they'd read as clutter
          around the sun, and on /about their DOM overlays don't exist, so
          the rocks would be dead weight drifting near the sun. They fade
          in on the way to the home perch. The Sputnik satellite is the
          /projects-and-toys door (and that page's subject), the rest are
          rocks. */}
      {ASTEROIDS.map((asteroid) => {
        // The rocket (spaceship) is parked along with its overlay link
        // (SolarOverlays) until the /journey copy is ready. Restore this
        // (and the Rocket import) to fly it again:
        //   <Rocket key={asteroid.name} config={asteroid} visible={view === "home"} />
        if (asteroid.name === "rocket") return null;
        // The blog-post rock is parked too: the post moved to /about's
        // work-sample cards, and SolarOverlays dropped its link
        if (asteroid.name === "recent") return null;
        // The LinkedIn rock is parked for now (not deleted — it may come
        // back): the icon pill covers the link. Its overlay in
        // SolarOverlays is commented out to match; drop this line and
        // restore that block to bring it back.
        if (asteroid.name === "linkedin") return null;
        return asteroid.name === "satellite" ? (
          <Satellite
            key={asteroid.name}
            config={asteroid}
            // The close-up shows it at every width (the page is nothing
            // without it); on /home it sits out below lg like the rocks
            visible={isProjects || (view === "home" && !isNarrow)}
            bodyLink={view === "home"}
            partsActive={isProjects}
          />
        ) : asteroid.name === "synthpad" ? (
          <DrumPad
            key={asteroid.name}
            config={asteroid}
            // No pad on phones: the sky above the sun is too tight for a
            // fourth clickable, and SolarOverlays hides its button too
            visible={view === "home" && !isPhone}
          />
        ) : (
          <Asteroid
            key={asteroid.name}
            config={asteroid}
            visible={view === "home" && !isNarrow}
          />
        );
      })}
      {/* The second solar system, far below this one: six knob-planets
          around a beat-pulsing sun (the space synth) */}
      {view === "synth" && <SynthSystem isNightMode={isNightMode} />}
      {/* The /journey cruise: the rocket ride's warp — open-space flight
          behind the story crawl, ended by the cockpit's "End trip" */}
      {view === "journey" && <JourneyCruise navigate={onNavigate} />}
      {/* Mounted before CameraRig: while a journey is active it must
          pose the camera first each frame (CameraRig stands down) */}
      <RocketJourney view={view} navigate={onNavigate} />
      <CameraRig view={view} />
      <SunSvgAnchor />
      <BodyAnchors />
    </Canvas>
  );
};

export default SolarScene;
