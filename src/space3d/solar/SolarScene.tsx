import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";

import CameraRig, { type SolarView } from "./CameraRig";
import Planet from "./Planet";
import Moon from "./Moon";
import Sun from "./Sun";
import Asteroid from "./Asteroid";
import Satellite from "./Satellite";
import Rocket from "./Rocket";
import DrumPad from "./DrumPad";
import RocketJourney from "./RocketJourney";
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
  // Below the lg breakpoint the camera switches to its NDC-fraction
  // framing (CameraRig) and the wide-screen body placement stops
  // fitting — the link bodies pull inward (constants.ts `compact`
  // overrides). On phone widths the 808 pad sits out entirely.
  const { width } = useWindowWidth();
  const isCompact = width < 1280;
  const isPhone = width < 768;
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
        targetGlowScale={view === "home" ? 2.2 : 4}
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
      <Moon
        orbitColor={isNightMode ? "#ffffff" : "#141428"}
        orbitOpacity={isNightMode ? 0.28 : 0.2}
        revealed={planetsRevealed}
        linkActive={view === "about"}
      />
      {/* Link bodies — home view only: on landing they'd read as clutter
          around the sun, and on /about their DOM overlays don't exist, so
          the rocks would be dead weight drifting near the sun. They fade
          in on the way to the home perch. GitHub gets the Sputnik
          satellite, the rest are rocks. */}
      {ASTEROIDS.map((asteroid) =>
        asteroid.name === "github" ? (
          <Satellite
            key={asteroid.name}
            config={asteroid}
            visible={view === "home"}
          />
        ) : asteroid.name === "rocket" ? (
          <Rocket
            key={asteroid.name}
            config={asteroid}
            visible={view === "home"}
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
            visible={view === "home"}
          />
        ),
      )}
      {/* The second solar system, far below this one: six knob-planets
          around a beat-pulsing sun (the space synth) */}
      {view === "synth" && <SynthSystem isNightMode={isNightMode} />}
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
