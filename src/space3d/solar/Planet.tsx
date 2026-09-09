import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { planetPosition, type SolarPlanetConfig } from "./constants";
import { applyOffAxisSquash } from "./offAxisSquash";
import { createPlanetTexture } from "../textures";
import { hoverState } from "../../solarHover";
import { EARTH_ABOUT_OUTLINE_ID } from "../../solarAnchorIds";
import { writeSilhouette } from "./outline";
import { applyShimmer } from "./shimmerBand";
import { applyWireSkin, wireState, wireTint } from "./wireSkin";
import { createEnergyWave } from "./energyWave";
import AboutRing from "./AboutRing";
import InteractiveGlow from "./InteractiveGlow";
import earthMapUrl from "../../assets/earth.jpg";

/**
 * One orbiting planet + its orbit ring, ported from hunt-codes-3.
 * Textures are the shared procedural canvas maps; Earth gets a faint
 * back-side atmosphere shell. Positions come from the shared clock so
 * the camera rig can compute the same orbit for its Earth perch. Earth
 * also carries the curved "ABOUT ME" link label (space3d AboutRing), the
 * clickable-body halo and — on /home, where it is the link — the shared
 * purple energy wave (energyWave.ts), the same affordance the satellite
 * pulses down its antennas.
 */
/** Earth's energy wave: it rises up the screen across the globe, a hair
 *  wider and softer than the satellite's (Earth is a big, textured
 *  surface — a tight band over it reads as a seam rather than a pulse),
 *  and clear of the limb at both ends of its run. */
const WAVE_HALF_WIDTH_RADII = 0.55;
const WAVE_STRENGTH = 0.5;
/** Fade duration for the landing-intro reveal */
const REVEAL_SECONDS = 0.8;

// >1 white multiplier on Earth's diffuse: the sun-facing side (diffuse =
// map x color x sunlight) brightens, while the night side — lit almost
// entirely by the emissive earthshine — barely moves
const EARTH_SUNLIT_BOOST = new THREE.Color(1.45, 1.45, 1.45);

/** Per-frame scratch (screen-up for the wave) and a fallback center */
const camUp = new THREE.Vector3();
const ORIGIN = new THREE.Vector3();

/**
 * Mesh view's per-planet wires. Mercury and Venus keep the scene's
 * blue-white; the two the camera actually visits are coloured, and run a
 * little under the default gain so the sun stays the brightest thing in
 * the sky.
 *
 * Earth is two-toned: royal blue sea under neon green land, split by a
 * noise field rather than the real coastlines — an abstract globe, not a
 * map.
 */
/** Between-the-wires glow for Venus, Mars and the moon (wireSkin `fill`) */
export const PLANET_WIRE_FILL = 0.14;

const wireSkinFor = (kind: SolarPlanetConfig["kind"]) => {
  // Every planet is lit from the sun in mesh view too (wireSkin `sunlit`)
  const sunlit = true;
  // The coarser cages get an even glow between their wires so they read
  // about as solid as Earth, whose 36x24 grid hazes into one on its own
  const fill = PLANET_WIRE_FILL;
  if (kind === "earth") {
    // Earth carries the /about perch, so it gets a finer grid — at that
    // range a 20-meridian globe reads as a beach ball. It also folds
    // hover into its wires, because the atmosphere shell that carries the
    // hover in space view is faded out in mesh view.
    return {
      sunlit,
      lon: 36,
      lat: 24,
      hover: true,
      gain: 0.8,
      tint: wireTint("#2b5cff"),
      tintAlt: wireTint("#27ff6a"),
      tintAltCoverage: 1 / 3,
    };
  }
  if (kind === "mars") {
    // A shade darker than pure neon red, but still redder and brighter
    // than Mercury's rust
    return {
      sunlit,
      fill,
      lon: 20,
      lat: 14,
      gain: 0.72,
      tint: wireTint("#e8231a"),
    };
  }
  if (kind === "mercury") {
    // Tan: brown leaning to sand, still neon-ish
    return {
      sunlit,
      lon: 20,
      lat: 14,
      gain: 0.72,
      tint: wireTint("#c4864a"),
    };
  }
  if (kind === "venus") {
    // The shared blue-white leaned a touch toward yellow-beige
    return {
      sunlit,
      fill,
      lon: 20,
      lat: 14,
      gain: 0.85,
      tint: wireTint("#eadfbf"),
    };
  }
  return { sunlit, lon: 20, lat: 14, gain: 0.85 };
};

export default function Planet({
  config,
  orbitColor,
  orbitOpacity,
  isSpaceView = true,
  aboutActive = false,
  revealed = true,
  closeUp = false,
}: {
  config: SolarPlanetConfig;
  orbitColor: string;
  orbitOpacity: number;
  /** Drives the Earth "ABOUT ME" label color (white in space view,
   *  blue-white in mesh) */
  isSpaceView?: boolean;
  /** Show the Earth "ABOUT ME" label (home view only) */
  aboutActive?: boolean;
  /** Fades the planet + its orbit ring in (landing intro) */
  revealed?: boolean;
  /** The camera is perched on this planet (/about): upgrade Earth to the
   *  lazily-loaded 4K map the first time this goes true */
  closeUp?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const squashWrapper = useRef<THREE.Group>(null);
  const squashCounterRotate = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const surfaceMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const atmosphereMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const orbitMaterial = useRef<THREE.LineBasicMaterial>(null);
  const revealOpacity = useRef(revealed ? 1 : 0);
  // Atmosphere base opacity (hover-eased); multiplied by the reveal so the
  // fade-in and the hover swell compose instead of fighting each other
  const atmosphereBase = useRef(0.16);

  const wave = useMemo(
    () =>
      createEnergyWave({
        radius: config.radius,
        halfWidthRadii: WAVE_HALF_WIDTH_RADII,
        strength: WAVE_STRENGTH,
      }),
    [config.radius],
  );
  // The wave is folded into Earth's own surface material, so it is masked
  // by the globe's shape and reveal alpha. The material is built in JSX,
  // so hook the band on when the ref lands (and recompile: by then the
  // material may already have a program).
  const patched = useRef(false);
  const setSurfaceMaterial = useCallback(
    (material: THREE.MeshStandardMaterial | null) => {
      surfaceMaterial.current = material;
      if (!material || patched.current) return;
      patched.current = true;
      applyWireSkin(material, wireSkinFor(config.kind));
      if (config.kind === "earth") applyShimmer(material, [wave.uniforms]);
      material.needsUpdate = true;
    },
    [config.kind, wave],
  );

  const gl = useThree((s) => s.gl);
  // Grazing views (the /about perch looks across Earth's limb) need real
  // anisotropic filtering — the old hardcoded 4 smeared the surface
  const maxAnisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());

  const texture = useMemo(() => {
    if (config.kind === "earth") {
      // Real NASA Blue Marble Next Generation, July w/ topography +
      // bathymetry (public domain), bundled locally so there's no runtime
      // CORS dependency. The 4K upgrade below is cut from the SAME source
      // image, so swapping it in sharpens without any color pop. The
      // equirectangular map puts the Arctic at the north pole — exactly
      // what the home camera looks down on — so the visible curve reads
      // as the green, ice-capped northern hemisphere.
      const tex = new THREE.TextureLoader().load(earthMapUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAnisotropy;
      return tex;
    }
    return createPlanetTexture(config.kind);
  }, [config, maxAnisotropy]);
  useEffect(() => () => texture.dispose(), [texture]);

  // The 2K map is ~5x under-resolved at the /about zoom. The first time
  // the close-up view is active, swap in the 4K map — its own lazy chunk,
  // so casual visits never download it.
  const hiRes = useRef<THREE.Texture | null>(null);
  const hiResRequested = useRef(false);
  useEffect(() => {
    if (!closeUp || hiResRequested.current || config.kind !== "earth") return;
    hiResRequested.current = true;
    let cancelled = false;
    void import("../../assets/earth-4k.jpg").then(({ default: url }) => {
      if (cancelled) return;
      new THREE.TextureLoader().load(url, (tex) => {
        const mat = surfaceMaterial.current;
        if (cancelled || !mat) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAnisotropy;
        hiRes.current = tex;
        mat.map = tex;
        mat.emissiveMap = tex;
        mat.needsUpdate = true;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [closeUp, config.kind, maxAnisotropy]);
  useEffect(
    () => () => {
      hiRes.current?.dispose();
    },
    [],
  );

  const orbitLine = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(a) * config.orbitRadius,
          0,
          Math.sin(a) * config.orbitRadius,
        ),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [config.orbitRadius]);
  useEffect(() => () => orbitLine.dispose(), [orbitLine]);

  useFrame(({ clock, camera, size }, delta) => {
    if (group.current) {
      planetPosition(config, clock.elapsedTime, group.current.position);
      // Cancel the wide-lens corner stretching (fades out up close)
      if (squashWrapper.current && squashCounterRotate.current) {
        applyOffAxisSquash(
          squashWrapper.current,
          squashCounterRotate.current,
          camera,
          group.current.position,
          config.radius,
        );
      }
    }
    if (mesh.current) {
      mesh.current.rotation.y += delta * config.spinSpeed;
    }

    // Landing-intro reveal: ramp opacity 0→1 (or back) and push it into the
    // surface + orbit ring, so the planets fade in a beat after the sun.
    revealOpacity.current = THREE.MathUtils.clamp(
      revealOpacity.current + (revealed ? delta : -delta) / REVEAL_SECONDS,
      0,
      1,
    );
    if (surfaceMaterial.current) {
      surfaceMaterial.current.opacity = revealOpacity.current;
    }
    if (orbitMaterial.current) {
      orbitMaterial.current.opacity = orbitOpacity * revealOpacity.current;
    }

    if (config.kind === "earth") {
      // The energy wave rises up the screen over the globe while the
      // /about link is live (home view only, like the halo)
      camUp.setFromMatrixColumn(camera.matrixWorld, 1);
      wave.update({
        time: clock.elapsedTime,
        delta,
        active: aboutActive,
        opacity: revealOpacity.current,
        origin: group.current?.position ?? ORIGIN,
        direction: camUp,
      });

      // Ease the glow up while the "About Me" ring/planet is hovered:
      // the atmosphere shell thickens and the earthshine brightens
      const hovered = hoverState.earth;
      const ease = Math.min(delta * 6, 1);
      atmosphereBase.current +=
        ((hovered ? 0.5 : 0.16) - atmosphereBase.current) * ease;
      if (atmosphereMaterial.current) {
        // The shell reads as a rim only because the globe's depth buffer
        // rejects its far half inside the silhouette. Mesh view turns
        // depth writing off to see through the body, so the whole
        // back-side shell would survive and normal-blend a flat blue
        // disc over the lattice — worse on hover, where it swells to
        // 0.5. Fade it out with the crossfade; the wire skin's fresnel
        // rim is mesh view's limb, and its hover term the swell.
        atmosphereMaterial.current.opacity =
          atmosphereBase.current *
          revealOpacity.current *
          (1 - wireState.amount);
      }
      if (surfaceMaterial.current) {
        surfaceMaterial.current.emissiveIntensity +=
          ((hovered ? 0.62 : 0.28) -
            surfaceMaterial.current.emissiveIntensity) *
          ease;
      }
      if (hovered && mesh.current) {
        // Same pulsing hover outline as the link asteroids/satellite: cut
        // Earth's screen silhouette and hand it to the /about overlay's
        // outline paths (Earth stays a circle while spinning, so no
        // spin-freeze is needed here)
        writeSilhouette(EARTH_ABOUT_OUTLINE_ID, [mesh.current], camera, size);
      }
    }
  });

  return (
    <>
      <lineLoop geometry={orbitLine}>
        <lineBasicMaterial
          ref={orbitMaterial}
          color={orbitColor}
          transparent
          opacity={orbitOpacity}
        />
      </lineLoop>
      <group ref={group}>
        <group ref={squashWrapper}>
          <group ref={squashCounterRotate}>
            <mesh ref={mesh}>
              {/* Earth gets double the segments: the /about perch sits so
                  close that 48 shows flat spots on the limb */}
              <sphereGeometry
                args={[
                  config.radius,
                  config.kind === "earth" ? 96 : 48,
                  config.kind === "earth" ? 96 : 48,
                ]}
              />
              {config.kind === "earth" ? (
                // Earth self-illuminates faintly (its own map as the
                // emissive map): the home view faces its night side, which
                // would otherwise be a near-black silhouette. The cool tint
                // reads as earthshine so oceans/land stay recognizable in
                // the dark.
                <meshStandardMaterial
                  ref={setSurfaceMaterial}
                  map={texture}
                  color={EARTH_SUNLIT_BOOST}
                  roughness={0.95}
                  metalness={0}
                  emissive="#a7bad4"
                  emissiveMap={texture}
                  emissiveIntensity={0.28}
                  transparent
                />
              ) : (
                <meshStandardMaterial
                  ref={setSurfaceMaterial}
                  map={texture}
                  roughness={0.95}
                  metalness={0}
                  transparent
                />
              )}
            </mesh>
            {config.kind === "earth" && (
              // faint atmosphere shell (same segment count as the surface
              // so the rim facets can't mismatch the limb)
              <mesh scale={1.04}>
                <sphereGeometry args={[config.radius, 96, 96]} />
                <meshBasicMaterial
                  ref={atmosphereMaterial}
                  color="#6ab0ff"
                  transparent
                  opacity={0.16}
                  side={THREE.BackSide}
                />
              </mesh>
            )}
          </group>
        </group>
        {/* Curved "ABOUT ME" link label, billboarded around Earth. Lives in
            the group (not the squash wrapper) so it stays put over Earth. */}
        {config.kind === "earth" && (
          <>
            <AboutRing active={aboutActive} isSpaceView={isSpaceView} />
            {/* clickable-body affordance halo (the /about link, home only;
                a lighter touch than the small rocks — Earth is big) */}
            <InteractiveGlow
              radius={config.radius}
              opacityRef={revealOpacity}
              enabled={aboutActive}
              strength={0.3}
            />
          </>
        )}
      </group>
    </>
  );
}
