import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { badgeHoverState } from "../badgeState";
import badgeUrl from "../assets/hunt-codes-badge.glb";

/**
 * The "hunt.codes" medallion (the exported coin from three-d-stage),
 * slowly rotating in the bottom-right corner. It lives INSIDE the shared
 * orthographic star canvas — a third WebGL context for a 140px coin
 * pushed Chrome over its per-domain context limit and set off an
 * evict/restore cascade that strobed the star field, so the badge draws
 * in pixel space alongside the stars instead (world units are CSS px;
 * the group re-anchors to the corner each frame).
 *
 * The gold monogram is authored as a single "A|" mesh — the letter and a
 * vertical bar to its right. We split that geometry (the two are cleanly
 * separated at x ≈ 6.5 in monogram-local space) so the bar can blink on
 * and off like a text-input caret while the rest of the badge stays lit.
 *
 * The clickable layer is a fixed DOM link glued over the same corner
 * (BadgeLink in Landing/AppBackground chrome) — the canvas itself never
 * takes pointer input. Hover flows through badgeHoverState, the same
 * plain-mutable-module pattern as solarHover.
 */

// Monogram-local x: the "A" spans ~0–6.24, the caret bar ~6.97–8.33.
const CARET_SPLIT_X = 6.5;
// Match a text caret's cadence: ~530ms visible, ~530ms hidden.
const CARET_HALF_PERIOD_S = 0.53;
const SPIN_SPEED = 0.6; // rad/s → ~10s per revolution
const SPIN_SPEED_HOVER = 1.7; // the coin perks up under the cursor
const HOVER_SCALE = 1.07;
/** Corner slot, matching the DOM link (App.scss .badge-link) */
const SLOT_PX = 140;
const SLOT_PX_SMALL = 96;
const SMALL_BREAKPOINT_PX = 768; // $breakpoint-sm
const MARGIN_PX = 8; // 0.5rem
/** Coin diameter as a fraction of the slot */
const FILL = 0.88;
/** Above the stars (z 0), well inside the ortho frustum (camera z 1000) */
const BADGE_Z = 200;

type SplitGeometry = { letter: THREE.BufferGeometry; caret: THREE.BufferGeometry };

// Partition a non-indexed monogram geometry into the "A" and the caret bar
// by each triangle's centroid x. Returns two fresh BufferGeometries.
const splitMonogram = (geo: THREE.BufferGeometry, splitX: number): SplitGeometry => {
  // Guard against an indexed re-export of the GLB: the per-triangle walk
  // below assumes triangle soup
  const soup = geo.index ? geo.toNonIndexed() : geo;
  const pos = soup.getAttribute("position");
  const nor = soup.getAttribute("normal");
  const uv = soup.getAttribute("uv");

  const letter = { p: [] as number[], n: [] as number[], u: [] as number[] };
  const caret = { p: [] as number[], n: [] as number[], u: [] as number[] };

  for (let t = 0; t < pos.count; t += 3) {
    const centroidX = (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3;
    const target = centroidX > splitX ? caret : letter;
    for (let k = 0; k < 3; k++) {
      const i = t + k;
      target.p.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      if (nor) target.n.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      if (uv) target.u.push(uv.getX(i), uv.getY(i));
    }
  }

  const build = (part: { p: number[]; n: number[]; u: number[] }) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(part.p, 3));
    if (part.n.length) g.setAttribute("normal", new THREE.Float32BufferAttribute(part.n, 3));
    if (part.u.length) g.setAttribute("uv", new THREE.Float32BufferAttribute(part.u, 2));
    return g;
  };

  return { letter: build(letter), caret: build(caret) };
};

const BadgeMedallion = () => {
  const gltf = useLoader(GLTFLoader, badgeUrl);

  // Track prefers-reduced-motion live (a read-once snapshot would miss the
  // visitor toggling it mid-session)
  const reducedMotion = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = query.matches;
    const onChange = (e: MediaQueryListEvent) => {
      reducedMotion.current = e.matches;
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Clone so the cached GLTF stays pristine, split the monogram, recenter
  // the coin on the origin, and measure it so the frame loop can scale it
  // to the corner slot in CSS pixels.
  const { object, caretMaterial, coinDiameter } = useMemo(() => {
    const root = gltf.scene.clone(true);

    // The monogram is authored only on the front face — find it, then
    // process outside the traversal (we're about to graft new nodes on).
    let monogram: THREE.Mesh | null = null;
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.name === "monogram_A") monogram = mesh;
    });

    // A holder (not a bare `let`) so its type survives the closures above.
    const caret: { material: THREE.MeshStandardMaterial | null } = { material: null };

    if (monogram && (monogram as THREE.Mesh).parent) {
      const mono = monogram as THREE.Mesh;
      const parts = splitMonogram(mono.geometry, CARET_SPLIT_X);
      if (process.env.NODE_ENV !== "production" && !parts.caret.getAttribute("position")?.count) {
        console.warn(
          "BadgeMedallion: caret split found no caret triangles — did a GLB re-export move the monogram? Check CARET_SPLIT_X.",
        );
      }
      mono.geometry = parts.letter;
      // The caret is its own white, blinking material (a separate clone so
      // toggling its opacity leaves the gold "A" fully lit).
      const caretMat = (mono.material as THREE.MeshStandardMaterial).clone();
      caretMat.color.set("#ffffff");
      caretMat.emissive.set("#ffffff");
      caretMat.emissiveIntensity = 0.4;
      caretMat.transparent = true;
      caret.material = caretMat;
      // The caret rides inside the monogram node, inheriting its transform.
      mono.add(new THREE.Mesh(parts.caret, caretMat));

      // Mirror the whole "A|" onto the back face: a 180°-about-Y pivot maps
      // the front monogram to the reverse side, reading correctly from
      // behind. The clone shares the caret material, so both bars blink in
      // sync, and shares the gold "A" material.
      const back = mono.clone(true);
      const pivot = new THREE.Group();
      pivot.rotation.y = Math.PI;
      pivot.add(back);
      (mono.parent as THREE.Object3D).add(pivot);
    }

    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());
    return {
      object: root,
      caretMaterial: caret.material,
      coinDiameter: sphere.radius * 2 || 1,
    };
  }, [gltf]);

  const anchorRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const hoverEase = useRef(0);
  // Grow-in on load so the coin doesn't pop mid-choreography (the GLB
  // arrives async); reduced motion skips straight to full size
  const mountEase = useRef(0);

  useFrame((state, delta) => {
    const anchor = anchorRef.current;
    const spin = spinRef.current;
    if (!anchor || !spin) return;

    // Re-anchor to the bottom-right corner in CSS-pixel world units
    const { width, height } = state.size;
    const slot = width <= SMALL_BREAKPOINT_PX ? SLOT_PX_SMALL : SLOT_PX;
    anchor.position.set(
      width / 2 - MARGIN_PX - slot / 2,
      -height / 2 + MARGIN_PX + slot / 2,
      BADGE_Z,
    );

    // Hover (from the DOM link): ease toward a livelier spin + a nudge up
    const hoverTarget = badgeHoverState.hovered ? 1 : 0;
    hoverEase.current +=
      (hoverTarget - hoverEase.current) * Math.min(1, delta * 8);
    mountEase.current = reducedMotion.current
      ? 1
      : Math.min(1, mountEase.current + delta / 0.6);
    const grow = 1 - Math.pow(1 - mountEase.current, 3); // ease-out cubic
    const scale =
      ((slot * FILL) / coinDiameter) *
      grow *
      (1 + (HOVER_SCALE - 1) * hoverEase.current);
    anchor.scale.setScalar(scale || 0.0001);

    if (!reducedMotion.current) {
      spin.rotation.y +=
        delta * (SPIN_SPEED + (SPIN_SPEED_HOVER - SPIN_SPEED) * hoverEase.current);
    }
    if (caretMaterial) {
      const visible = reducedMotion.current
        ? true
        : Math.floor(state.clock.elapsedTime / CARET_HALF_PERIOD_S) % 2 === 0;
      caretMaterial.opacity = visible ? 1 : 0;
    }
  });

  return (
    <group ref={anchorRef}>
      {/* The coin brings its own light: the star canvas is otherwise unlit
          (point sprites), so these only touch the badge */}
      <ambientLight intensity={0.85} />
      <pointLight position={[60, 90, 320]} intensity={1.3} decay={0} />
      {/* A soft fill from behind keeps the coin's back readable as it spins */}
      <pointLight position={[-40, -30, -320]} intensity={0.5} decay={0} />
      <group ref={spinRef}>
        <primitive object={object} />
      </group>
    </group>
  );
};

export default BadgeMedallion;
