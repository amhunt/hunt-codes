import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

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
 * The clickable layer is a fixed DOM hit target glued over the same
 * corner (BadgeLink, mounted app-wide in App.tsx) — the canvas itself
 * never takes pointer input. Hover flows through badgeHoverState, the
 * same plain-mutable-module pattern as solarHover: under the cursor the
 * coin grows a touch, slows its spin to half, and blinks its caret twice
 * as fast.
 */

// Monogram-local x: the "A" spans ~0–6.24, the caret bar ~6.97–8.33.
const CARET_SPLIT_X = 6.5;
// The signature-A mark (the favicon logo, "Asset 2" export); extruded in
// place of the authored block "A".
const SIGNATURE_VIEWBOX = "0 0 173.91 198.63";
const SIGNATURE_D =
  "M173.91,111.43l-13.26-11.12h-27.69l-1.95-87.93-.06-.9-.2-1.34-.27-1.08-.47-1.3-.88-1.72-.78-1.12-.73-.86-1.61-1.46-1.65-1.06-1.22-.58-1.08-.39-1.31-.33-1.11-.17-1.59-.08-1.38.12-1.63.33-1.1.34-1.44.64-1.41.85-1.3,1.04-1.14,1.19-.96,1.28-57.65,94.51-29.24.02-1.54.17-.89.19-1.39.45-1.4.65-.8.47-1.15.86-1.12,1.07-.99,1.23-.81,1.33-.87,2.17-.36,1.65-.13,1.71.08,1.29.27,1.55.48,1.5.35.82.71,1.27,1.26,1.7,17.41,12.92L1.86,179.31l-.66,1.24-.6,1.53-.43,1.76-.18,1.76.06,1.4.25,1.63.46,1.58.66,1.52.47.84.89,1.25,1.11,1.22,1.28,1.07,1.39.89,1.49.7,1.58.5,2.54.44,48.11-14.74,3.09-18.38-16.73-1.58-9.38,3.67,13.93-20.84,64.96,34.01,1.4.59.92.29,1.53.31,1.85.14.78-.04,1.51-.2.94-.21,1.47-.5,1.49-.72.85-.52,1.2-.92.72-.67,1.01-1.16.57-.79.76-1.32.64-1.54.44-1.62.16-.95.09-1.68-.99-45.05h28l12.43-12.82ZM106.64,56.17l.98,44.14h-27.9l26.93-44.14ZM64.36,125.49l.75-1.24h43.03l.54,24.49-44.33-23.26Z";

/**
 * How far past the authored "A" bbox the signature mark may spill. With
 * the rivets gone the face is all the signature's, so it runs big.
 */
const SIGNATURE_OVERSIZE = 2;

// Extrude the signature mark and center it on the bbox the authored "A"
// occupied (same depth, SIGNATURE_OVERSIZE× the footprint), so the coin
// layout, caret, and back-face mirror all keep working unchanged.
const buildSignatureGeometry = (
  letterBox: THREE.Box3,
): THREE.BufferGeometry => {
  const svg = new SVGLoader().parse(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SIGNATURE_VIEWBOX}"><path fill="#000" fill-rule="evenodd" d="${SIGNATURE_D}"/></svg>`,
  );
  const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p));
  const depth = letterBox.max.z - letterBox.min.z || 0.5;
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: false,
    curveSegments: 10,
  });
  // SVG y grows downward; flip via rotation, not a mirror scale, so the
  // triangle winding survives (a negative scale gets backface-culled).
  geo.rotateX(Math.PI);
  geo.computeBoundingBox();
  let box = geo.boundingBox as THREE.Box3;
  const fit = Math.min(
    (letterBox.max.x - letterBox.min.x) / (box.max.x - box.min.x),
    (letterBox.max.y - letterBox.min.y) / (box.max.y - box.min.y),
  );
  // Oversize past the authored "A" footprint: the thin signature stroke
  // needs the presence, and its tail drifting into the caret's lane is fine.
  geo.scale(fit * SIGNATURE_OVERSIZE, fit * SIGNATURE_OVERSIZE, 1);
  geo.computeBoundingBox();
  box = geo.boundingBox as THREE.Box3;
  const from = box.getCenter(new THREE.Vector3());
  const to = letterBox.getCenter(new THREE.Vector3());
  geo.translate(to.x - from.x, to.y - from.y, letterBox.min.z - box.min.z);
  return geo;
};
// Match a text caret's cadence: ~530ms visible, ~530ms hidden.
const CARET_HALF_PERIOD_S = 0.53;
// Hover doubles the blink rate
const CARET_BLINK_RATE_HOVER = 2;
const SPIN_SPEED = 0.6; // rad/s → ~10s per revolution
// Under the cursor the coin settles to half speed — a "look at me" hold
// rather than a flourish
const SPIN_SPEED_HOVER = SPIN_SPEED * 0.5;
const HOVER_SCALE = 1.05;
// Hover ease rate (per second): ~0.1s time constant, so the scale and
// spin changes read as a short transition rather than a snap
const HOVER_EASE_RATE = 10;
/** Corner slot, matching the DOM link (App.scss .badge-link) */
const SLOT_PX = 140;
const SLOT_PX_SMALL = 96;
const SMALL_BREAKPOINT_PX = 768; // $breakpoint-sm
const MARGIN_PX = 8; // 0.5rem
/** Coin diameter as a fraction of the slot */
const FILL = 0.88;
/** Above the stars (z 0), well inside the ortho frustum (camera z 1000) */
const BADGE_Z = 200;

type SplitGeometry = {
  letter: THREE.BufferGeometry;
  caret: THREE.BufferGeometry;
};

// Partition a geometry's triangles by a predicate on each centroid
// (geometry-local coords). Returns two fresh BufferGeometries.
const partitionTriangles = (
  geo: THREE.BufferGeometry,
  test: (cx: number, cy: number, cz: number) => boolean,
): { hit: THREE.BufferGeometry; miss: THREE.BufferGeometry } => {
  // Guard against an indexed re-export of the GLB: the per-triangle walk
  // below assumes triangle soup
  const soup = geo.index ? geo.toNonIndexed() : geo;
  const pos = soup.getAttribute("position");
  const nor = soup.getAttribute("normal");
  const uv = soup.getAttribute("uv");

  const hit = { p: [] as number[], n: [] as number[], u: [] as number[] };
  const miss = { p: [] as number[], n: [] as number[], u: [] as number[] };

  for (let t = 0; t < pos.count; t += 3) {
    const target = test(
      (pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3,
      (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3,
      (pos.getZ(t) + pos.getZ(t + 1) + pos.getZ(t + 2)) / 3,
    )
      ? hit
      : miss;
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
    if (part.n.length)
      g.setAttribute("normal", new THREE.Float32BufferAttribute(part.n, 3));
    if (part.u.length)
      g.setAttribute("uv", new THREE.Float32BufferAttribute(part.u, 2));
    return g;
  };

  return { hit: build(hit), miss: build(miss) };
};

// Split the monogram into the "A" and the caret bar by centroid x (the two
// are cleanly separated in monogram-local space).
const splitMonogram = (
  geo: THREE.BufferGeometry,
  splitX: number,
): SplitGeometry => {
  const parts = partitionTriangles(geo, (cx) => cx > splitX);
  return { letter: parts.miss, caret: parts.hit };
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

    // The monogram is authored only on the front face — find it (plus the
    // lilac rim pieces for the recolor pass below, and the four authored
    // rivet spheres, which go), then process outside the traversal (we're
    // about to graft new nodes on / prune old ones).
    let monogram: THREE.Mesh | null = null;
    const lilacMeshes: THREE.Mesh[] = [];
    const rivetMeshes: THREE.Mesh[] = [];
    // Same holder trick as `caret` below, so the type survives the closure.
    const gold: { material: THREE.MeshStandardMaterial | null } = {
      material: null,
    };
    const disc: { mesh: THREE.Mesh | null } = { mesh: null };
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.name === "monogram_A") {
        monogram = mesh;
        // The authored gold — the recolor pass borrows it for the rim.
        gold.material = mesh.material as THREE.MeshStandardMaterial;
      }
      if (mesh.name === "disc") disc.mesh = mesh;
      if ((mesh.material as THREE.MeshStandardMaterial)?.name === "lilac")
        lilacMeshes.push(mesh);
      if (mesh.name.startsWith("star_")) rivetMeshes.push(mesh);
    });
    // The four cyan rivets are authored into the GLB; the redesign drops
    // them so the face is just the signature.
    rivetMeshes.forEach((mesh) => mesh.removeFromParent());

    // A holder (not a bare `let`) so its type survives the closures above.
    const caret: { material: THREE.MeshStandardMaterial | null } = {
      material: null,
    };

    if (monogram && (monogram as THREE.Mesh).parent) {
      const mono = monogram as THREE.Mesh;
      const parts = splitMonogram(mono.geometry, CARET_SPLIT_X);
      if (
        process.env.NODE_ENV !== "production" &&
        !parts.caret.getAttribute("position")?.count
      ) {
        console.warn(
          "BadgeMedallion: caret split found no caret triangles — did a GLB re-export move the monogram? Check CARET_SPLIT_X.",
        );
      }
      // Swap the authored block "A" for the signature mark, fitted to the
      // same footprint; the blinking caret bar stays as authored.
      parts.letter.computeBoundingBox();
      mono.geometry = buildSignatureGeometry(
        parts.letter.boundingBox as THREE.Box3,
      );
      // White, with its own glow: the signature stroke is far thinner than
      // the block "A", so it needs the lift to stay legible at 140px.
      const sigMat = (mono.material as THREE.MeshStandardMaterial).clone();
      sigMat.color.set("#ffffff");
      sigMat.emissive.set("#ffffff");
      sigMat.emissiveIntensity = 0.35;
      mono.material = sigMat;
      // The caret is its own white, blinking material (a separate clone so
      // toggling its opacity leaves the "A" fully lit).
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
      // sync, and shares the "A" material.
      const back = mono.clone(true);
      const pivot = new THREE.Group();
      pivot.rotation.y = Math.PI;
      pivot.add(back);
      (mono.parent as THREE.Object3D).add(pivot);
    }

    // Recolor pass: the lilac rim/edge band goes gold, borrowing the
    // authored monogram metal.
    if (gold.material) {
      const rimGold = gold.material.clone();
      lilacMeshes.forEach((mesh) => {
        mesh.material = rimGold;
      });
    }

    // Blacken the coin face, keeping the indigo accent ring that peeks out
    // past the gold rim. Face and accent are one authored mesh/material, so
    // split the disc's triangles radially — the seam sits mid-rim, hidden
    // under the gold ring. Both meshes are authored rotated (the disc's
    // local axis is y), so measure radii in the coin's frame via each
    // node's local matrix.
    const rimFront = lilacMeshes.find((mesh) => mesh.name === "rim_front");
    if (disc.mesh && rimFront) {
      // .matrix can be stale until the first render — compose both now.
      rimFront.updateMatrix();
      disc.mesh.updateMatrix();
      const v = new THREE.Vector3();
      const rimPos = rimFront.geometry.getAttribute("position");
      let rimInner = Infinity;
      let rimOuter = 0;
      for (let i = 0; i < rimPos.count; i++) {
        v.fromBufferAttribute(rimPos, i).applyMatrix4(rimFront.matrix);
        const r = Math.hypot(v.x, v.y);
        rimInner = Math.min(rimInner, r);
        rimOuter = Math.max(rimOuter, r);
      }
      const coreRadius = (rimInner + rimOuter) / 2;
      const face = disc.mesh;
      const parts = partitionTriangles(face.geometry, (cx, cy, cz) => {
        v.set(cx, cy, cz).applyMatrix4(face.matrix);
        return Math.hypot(v.x, v.y) < coreRadius;
      });
      const indigo = face.material as THREE.MeshStandardMaterial;
      const blackMat = indigo.clone();
      blackMat.color.set("#08080d");
      face.geometry = parts.hit;
      face.material = blackMat;
      // The accent ring rides inside the disc node, keeping the authored
      // indigo and inheriting the disc's transform.
      face.add(new THREE.Mesh(parts.miss, indigo));
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
  // Caret blink phase in half-periods. Accumulated from frame deltas
  // rather than read off the clock so the hover speed-up changes the
  // rate without jumping the phase.
  const caretPhase = useRef(0);
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

    // Hover (from the DOM hit target): ease toward the slower spin, the
    // faster caret and the nudge up
    const hoverTarget = badgeHoverState.hovered ? 1 : 0;
    hoverEase.current +=
      (hoverTarget - hoverEase.current) * Math.min(1, delta * HOVER_EASE_RATE);
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
        delta *
        (SPIN_SPEED + (SPIN_SPEED_HOVER - SPIN_SPEED) * hoverEase.current);
    }
    if (caretMaterial) {
      caretPhase.current +=
        (delta / CARET_HALF_PERIOD_S) *
        (1 + (CARET_BLINK_RATE_HOVER - 1) * hoverEase.current);
      const visible = reducedMotion.current
        ? true
        : Math.floor(caretPhase.current) % 2 === 0;
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
