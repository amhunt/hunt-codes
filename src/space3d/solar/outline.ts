import * as THREE from "three";

/**
 * Shared hover-outline helper for the link bodies (asteroids, the
 * satellite): projects every vertex of the given meshes through the
 * camera, takes the 2D convex hull — an excellent stand-in for the
 * silhouette of near-convex bodies — and writes it as a path into the
 * body's DOM overlay (the `.asteroid-outline` svg), mapped into its
 * 0-100 viewBox. The overlay's CSS supplies the purple stroke and the
 * white perimeter pulses.
 */

export type Point2 = [number, number];

const scratchVertex = new THREE.Vector3();

const cross = (o: Point2, a: Point2, b: Point2) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Convex hull (Andrew's monotone chain), counter-clockwise. */
export function convexHull(points: Point2[]): Point2[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 3) return pts;
  const lower: Point2[] = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function writeSilhouette(
  outlineGroupId: string,
  meshes: THREE.Mesh[],
  camera: THREE.Camera,
  size: { width: number; height: number },
): void {
  const outlineGroup = document.getElementById(outlineGroupId);
  const svg = outlineGroup?.closest("svg");
  if (!outlineGroup || !svg) return;

  const points: Point2[] = [];
  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const positions = mesh.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      scratchVertex
        .fromBufferAttribute(positions, i)
        .applyMatrix4(mesh.matrixWorld)
        .project(camera);
      points.push([
        (scratchVertex.x * 0.5 + 0.5) * size.width,
        (0.5 - scratchVertex.y * 0.5) * size.height,
      ]);
    }
  }

  // Map viewport px -> the overlay svg's 0-100 viewBox (its rect is the
  // anchor box BodyAnchors placed around the body's projection)
  const rect = svg.getBoundingClientRect();
  if (rect.width <= 0) return;
  const d =
    convexHull(points)
      .map(
        ([x, y], i) =>
          `${i === 0 ? "M" : "L"}${(((x - rect.left) / rect.width) * 100).toFixed(2)} ${(((y - rect.top) / rect.height) * 100).toFixed(2)}`,
      )
      .join(" ") + " Z";
  outlineGroup.querySelectorAll("path").forEach((path) => {
    path.setAttribute("d", d);
  });
}
