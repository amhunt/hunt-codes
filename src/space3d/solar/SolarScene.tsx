import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";

import CameraRig, { type SolarView } from "./CameraRig";
import Planet from "./Planet";
import Moon from "./Moon";
import Sun from "./Sun";
import Asteroid from "./Asteroid";
import Satellite from "./Satellite";
import SunSvgAnchor from "./SunSvgAnchor";
import BodyAnchors from "./BodyAnchors";
import { ASTEROIDS, PLANETS } from "./constants";

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
}: {
  view: SolarView;
  isNightMode: boolean;
}) => {
  const isLanding = view === "landing";
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
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.14} />
      {/* From the home sun-perch the full glow would fill the frame and
          wash out the stars — shrink it to hug the limb there */}
      <Sun
        targetGlowScale={view === "home" ? 2.5 : 4}
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
          orbitOpacity={isNightMode ? 0.08 : 0.2}
          isNightMode={isNightMode}
          aboutActive={view === "home"}
          revealed={planetsRevealed}
        />
      ))}
      <Moon
        orbitColor={isNightMode ? "#ffffff" : "#141428"}
        orbitOpacity={isNightMode ? 0.08 : 0.2}
        revealed={planetsRevealed}
      />
      {/* Link bodies — hidden in the top-down landing view (they'd read
          as clutter around the sun); they fade in on the way to the home
          perch. GitHub gets the Sputnik satellite, the rest are rocks. */}
      {ASTEROIDS.map((asteroid) =>
        asteroid.name === "github" ? (
          <Satellite
            key={asteroid.name}
            config={asteroid}
            visible={view !== "landing"}
          />
        ) : (
          <Asteroid
            key={asteroid.name}
            config={asteroid}
            visible={view !== "landing"}
          />
        ),
      )}
      <CameraRig view={view} />
      <SunSvgAnchor />
      <BodyAnchors />
    </Canvas>
  );
};

export default SolarScene;
