import React, { useEffect, useRef } from "react";
import {
  AmbientLight,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ColorMesh } from "svg-to-3d";

/** Build-plate grid, tinted to the site's purple rather than three's grey */
const GRID_CENTER = 0x9e_80_f9;
const GRID_LINE = 0x3a_2d_6b;

/**
 * The orbitable preview of the extruded solids.
 *
 * This is its own WebGL context, which the site can only afford here
 * because `/svg-to-3d` isn't one of the routes that mounts the solar
 * system (Space3DBackground only builds SolarScene for landing / home /
 * about / projects / synth / journey). Star field + this viewer is two
 * contexts, which is the site's ceiling — a third trips Chrome's
 * per-domain cap and strobes the stars. If the solar scene is ever
 * extended to this route, this canvas has to go.
 *
 * The renderer is alpha-clear rather than opaque so the star field shows
 * through the panel, the way every other surface on the site does.
 *
 * Reframing is a prop rather than an imperative handle: bump `resetToken`
 * and the camera swings back to a fitted three-quarter view.
 */
const Preview3D = ({
  meshes,
  resetToken,
}: {
  meshes: ColorMesh[];
  /** Any change re-frames the camera on the current meshes */
  resetToken: number;
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const meshGroupRef = useRef<Mesh[]>([]);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridRef = useRef<GridHelper | null>(null);
  // frameToMeshes reads the refs above, so it never needs to be a
  // dependency — but the effects below call it, and stashing it here keeps
  // it out of their dependency lists without a useCallback dance
  const frameRef = useRef<(rebuildGrid: boolean) => void>(() => {});

  frameRef.current = (rebuildGrid: boolean) => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls) return;
    if (meshGroupRef.current.length === 0) return;

    const bbox = new Box3();
    for (const m of meshGroupRef.current) {
      m.geometry.computeBoundingBox();
      if (m.geometry.boundingBox) bbox.union(m.geometry.boundingBox);
    }
    if (bbox.isEmpty()) return;

    const size = new Vector3();
    const center = new Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 1);

    if (rebuildGrid && gridRef.current) {
      scene.remove(gridRef.current);
      gridRef.current.geometry.dispose();
      (gridRef.current.material as { dispose: () => void }).dispose();
      const gridSize = Math.ceil((maxDim * 2) / 10) * 10;
      const grid = new GridHelper(
        gridSize,
        gridSize / 10,
        GRID_CENTER,
        GRID_LINE,
      );
      scene.add(grid);
      gridRef.current = grid;
    }

    const dist = maxDim * 2.2;
    camera.position.set(
      center.x + dist,
      center.y + dist * 0.7,
      center.z + dist,
    );
    controls.target.copy(center);
    camera.near = Math.max(0.1, maxDim / 100);
    camera.far = maxDim * 50;
    camera.updateProjectionMatrix();
    controls.update();
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new Scene();
    sceneRef.current = scene;

    const width = host.clientWidth;
    const height = host.clientHeight;

    const camera = new PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(80, 80, 120);
    cameraRef.current = camera;

    // alpha so the build plate floats over the stars; DPR capped at 1.5 to
    // match the site's other canvases (App.scss's performance rules)
    const renderer = new WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearAlpha(0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    host.append(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    scene.add(new AmbientLight(0xff_ff_ff, 0.55));
    const key = new DirectionalLight(0xff_ff_ff, 0.9);
    key.position.set(80, 120, 60);
    scene.add(key);
    const fill = new DirectionalLight(0xff_ff_ff, 0.3);
    fill.position.set(-60, 40, -40);
    scene.add(fill);

    const grid = new GridHelper(200, 20, GRID_CENTER, GRID_LINE);
    scene.add(grid);
    gridRef.current = grid;

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      for (const m of meshGroupRef.current) {
        m.geometry.dispose();
        (m.material as MeshStandardMaterial).dispose();
      }
      meshGroupRef.current = [];
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    for (const m of meshGroupRef.current) {
      scene.remove(m);
      m.geometry.dispose();
      (m.material as MeshStandardMaterial).dispose();
    }
    meshGroupRef.current = [];

    for (const cm of meshes) {
      const geom = new BufferGeometry();
      geom.setAttribute("position", new BufferAttribute(cm.vertices, 3));
      geom.setIndex(new BufferAttribute(cm.triangles, 1));
      geom.computeVertexNormals();

      const mat = new MeshStandardMaterial({
        color: new Color(cm.color),
        metalness: 0.05,
        roughness: 0.75,
      });
      const mesh = new Mesh(geom, mat);
      scene.add(mesh);
      meshGroupRef.current.push(mesh);
    }

    frameRef.current(true);
  }, [meshes]);

  // "Reset view" — skipped on the first render, where the effect above has
  // already framed the fresh meshes
  const framedToken = useRef(resetToken);
  useEffect(() => {
    if (framedToken.current === resetToken) return;
    framedToken.current = resetToken;
    frameRef.current(false);
  }, [resetToken]);

  return <div ref={hostRef} className="svg3d-viewer" />;
};

export default Preview3D;
