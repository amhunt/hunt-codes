import React from "react";
import { Canvas } from "@react-three/fiber";

import CameraRig, { type SolarView } from "./CameraRig";
import Planet from "./Planet";
import Moon from "./Moon";
import Sun from "./Sun";
import Asteroid from "./Asteroid";
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
const SolarScene = ({
  view,
  isNightMode,
}: {
  view: SolarView;
  isNightMode: boolean;
}) => {
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
        targetGlowScale={view === "home" ? 2.5 : 6}
        isNightMode={isNightMode}
      />
      {PLANETS.map((planet) => (
        <Planet
          key={planet.name}
          config={planet}
          // hunt-codes-3's faint white rings, flipped dark for day mode
          orbitColor={isNightMode ? "#ffffff" : "#141428"}
          orbitOpacity={isNightMode ? 0.08 : 0.2}
        />
      ))}
      <Moon
        orbitColor={isNightMode ? "#ffffff" : "#141428"}
        orbitOpacity={isNightMode ? 0.08 : 0.2}
      />
      {ASTEROIDS.map((asteroid) => (
        <Asteroid
          key={asteroid.name}
          config={asteroid}
          withGithubLogo={asteroid.name === "github"}
        />
      ))}
      <CameraRig view={view} />
      <SunSvgAnchor />
      <BodyAnchors />
    </Canvas>
  );
};

export default SolarScene;
