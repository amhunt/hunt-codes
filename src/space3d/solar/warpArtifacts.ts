import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/**
 * The lightspeed journey's flyby cameos: little primitive-built props
 * (a martian, a saucer, a pair of Airbnb Bélos...) that drift past the
 * cockpit window as the /journey crawl rolls. Each builder returns a
 * group roughly 1.5 units tall, standing on +Y, "face" toward +Z;
 * JourneyCruise scales them, glues each to its own stretch of the
 * story, and flings them past the camera.
 *
 * Everything is standard-material primitives lit by the cruise rig's
 * own lights — cartoon props, not showpieces.
 */

const mat = (
  color: string,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    metalness: 0.05,
    ...extra,
  });

const add = (
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};

function saucer(): THREE.Group {
  const g = new THREE.Group();
  const hull = mat("#b9c2cc", { metalness: 0.7, roughness: 0.3 });
  const body = add(g, new THREE.SphereGeometry(1, 24, 12), hull);
  body.scale.set(1, 0.3, 1);
  add(
    g,
    new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    mat("#7de37d", { emissive: "#2fae2f", emissiveIntensity: 0.6 }),
    0,
    0.22,
    0,
  );
  const light = mat("#9e80f9", { emissive: "#9e80f9", emissiveIntensity: 1 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(
      g,
      new THREE.SphereGeometry(0.09, 8, 6),
      light,
      Math.cos(a) * 0.82,
      -0.06,
      Math.sin(a) * 0.82,
    );
  }
  add(g, new THREE.SphereGeometry(0.16, 10, 8), mat("#ff5252"), 0, -0.28, 0);
  return g;
}

function martian(): THREE.Group {
  const g = new THREE.Group();
  const green = mat("#58d158");
  const bodyMesh = add(
    g,
    new THREE.SphereGeometry(0.5, 16, 12),
    green,
    0,
    0.1,
    0,
  );
  bodyMesh.scale.set(0.8, 1, 0.65);
  add(g, new THREE.SphereGeometry(0.55, 18, 14), green, 0, 0.95, 0);
  const white = mat("#ffffff", { roughness: 0.4 });
  const black = mat("#14181c", { roughness: 0.4 });
  for (const side of [-1, 1]) {
    add(
      g,
      new THREE.SphereGeometry(0.17, 10, 8),
      white,
      side * 0.22,
      1.02,
      0.42,
    );
    add(g, new THREE.SphereGeometry(0.07, 8, 6), black, side * 0.2, 1.02, 0.56);
    // Antennae with red bobbles
    const stalk = add(
      g,
      new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6),
      green,
      side * 0.25,
      1.6,
      0,
    );
    stalk.rotation.z = -side * 0.35;
    add(
      g,
      new THREE.SphereGeometry(0.09, 8, 6),
      mat("#ff5252"),
      side * 0.33,
      1.82,
      0,
    );
  }
  // One arm down, one raised mid-wave (tilted so its top end meets the
  // waving hand at (0.72, 0.78))
  const armDown = add(
    g,
    new THREE.CylinderGeometry(0.07, 0.06, 0.6, 8),
    green,
    -0.45,
    0.15,
    0,
  );
  armDown.rotation.z = 0.5;
  const armUp = add(
    g,
    new THREE.CylinderGeometry(0.07, 0.06, 0.6, 8),
    green,
    0.58,
    0.54,
    0,
  );
  armUp.rotation.z = -0.55;
  add(g, new THREE.SphereGeometry(0.1, 8, 6), green, 0.72, 0.78, 0);
  for (const side of [-1, 1]) {
    add(
      g,
      new THREE.SphereGeometry(0.14, 8, 6),
      green,
      side * 0.2,
      -0.42,
      0.05,
    );
  }
  return g;
}

function cheeseburger(): THREE.Group {
  const g = new THREE.Group();
  const bun = mat("#e8b06b");
  add(g, new THREE.CylinderGeometry(0.75, 0.7, 0.26, 20), bun, 0, 0, 0);
  add(
    g,
    new THREE.CylinderGeometry(0.78, 0.78, 0.2, 20),
    mat("#7a4a26"),
    0,
    0.22,
    0,
  );
  const cheese = add(
    g,
    new THREE.BoxGeometry(1.5, 0.07, 1.5),
    mat("#ffcf3f", { roughness: 0.5 }),
    0,
    0.36,
    0,
  );
  cheese.rotation.y = Math.PI / 4;
  add(
    g,
    new THREE.CylinderGeometry(0.8, 0.8, 0.09, 20),
    mat("#7ccf4f"),
    0,
    0.44,
    0,
  );
  // Tomato pokes past the top bun (local bun radius ~0.78) like the lettuce
  add(
    g,
    new THREE.CylinderGeometry(0.82, 0.82, 0.09, 20),
    mat("#e04444"),
    0,
    0.53,
    0,
  );
  const top = add(g, new THREE.SphereGeometry(0.78, 20, 12), bun, 0, 0.52, 0);
  top.scale.set(1, 0.62, 1);
  const sesame = mat("#fff6e0", { roughness: 0.5 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    const r = 0.28 + (i % 3) * 0.14;
    add(
      g,
      new THREE.SphereGeometry(0.035, 6, 4),
      sesame,
      Math.cos(a) * r,
      0.52 + Math.sqrt(Math.max(0, 0.6 - r * r)) * 0.62,
      Math.sin(a) * r,
    );
  }
  return g;
}

function trafficCone(): THREE.Group {
  const g = new THREE.Group();
  add(g, new THREE.ConeGeometry(0.5, 1.2, 16), mat("#ff8c2e"), 0, 0.62, 0);
  add(
    g,
    new THREE.CylinderGeometry(0.34, 0.4, 0.2, 16),
    mat("#f4f0ea", { roughness: 0.5 }),
    0,
    0.62,
    0,
  );
  add(g, new THREE.BoxGeometry(1.1, 0.1, 1.1), mat("#e0741f"), 0, 0, 0);
  return g;
}

/** The Airbnb Bélo, extruded from the official glyph outline
 *  (simple-icons' 24×24 path — subpaths carry the counter-holes). */
const BELO_PATH =
  "M12.001 18.275c-1.353-1.697-2.148-3.184-2.413-4.457-.263-1.027-.16-1.848.291-2.465.477-.71 1.188-1.056 2.121-1.056s1.643.345 2.12 1.063c.446.61.558 1.432.286 2.465-.291 1.298-1.085 2.785-2.412 4.458zm9.601 1.14c-.185 1.246-1.034 2.28-2.2 2.783-2.253.98-4.483-.583-6.392-2.704 3.157-3.951 3.74-7.028 2.385-9.018-.795-1.14-1.933-1.695-3.394-1.695-2.944 0-4.563 2.49-3.927 5.382.37 1.565 1.352 3.343 2.917 5.332-.98 1.085-1.91 1.856-2.732 2.333-.636.344-1.245.558-1.828.609-2.679.399-4.778-2.2-3.825-4.88.132-.345.395-.98.845-1.961l.025-.053c1.464-3.178 3.242-6.79 5.285-10.795l.053-.132.58-1.116c.45-.822.635-1.19 1.351-1.643.346-.21.77-.315 1.246-.315.954 0 1.698.558 2.016 1.007.158.239.345.557.582.953l.558 1.089.08.159c2.041 4.004 3.821 7.608 5.279 10.794l.026.025.533 1.22.318.764c.243.613.294 1.222.213 1.858zm1.22-2.39c-.186-.583-.505-1.271-.9-2.094v-.03c-1.889-4.006-3.642-7.608-5.307-10.844l-.111-.163C15.317 1.461 14.468 0 12.001 0c-2.44 0-3.476 1.695-4.535 3.898l-.081.16c-1.669 3.236-3.421 6.843-5.303 10.847v.053l-.559 1.22c-.21.504-.317.768-.345.847C-.172 20.74 2.611 24 5.98 24c.027 0 .132 0 .265-.027h.372c1.75-.213 3.554-1.325 5.384-3.317 1.829 1.989 3.635 3.104 5.382 3.317h.372c.133.027.239.027.265.027 3.37.003 6.152-3.261 4.802-6.975z";

function belo(color: string): THREE.Group {
  const g = new THREE.Group();
  const [path] = new SVGLoader().parse(
    `<svg xmlns="http://www.w3.org/2000/svg"><path d="${BELO_PATH}"/></svg>`,
  ).paths;
  const geometry = new THREE.ExtrudeGeometry(SVGLoader.createShapes(path), {
    depth: 4,
    bevelEnabled: true,
    bevelThickness: 0.3,
    bevelSize: 0.3,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geometry.center();
  const mesh = new THREE.Mesh(
    geometry,
    mat(color, { roughness: 0.35, metalness: 0.1 }),
  );
  // SVG space is y-down: a half-turn about X rights the glyph (the Bélo
  // is left/right symmetric, so no mirror to worry about); scale the
  // 24-unit viewBox down to the builders' ~1.5-unit convention
  mesh.rotation.x = Math.PI;
  mesh.scale.setScalar(1.5 / 24);
  mesh.position.y = 0.75;
  g.add(mesh);
  return g;
}

/** Rausch, the brand salmon — the Airbnb chapters' cameo */
const beloRausch = (): THREE.Group => belo("#FF5A5F");
/** Babu, the brand teal — flies bigger and pirouetting (JourneyCruise
 *  gives its slot an oversized scale and spin) */
const beloBabu = (): THREE.Group => belo("#00A699");

function discoBall(): THREE.Group {
  const g = new THREE.Group();
  add(
    g,
    new THREE.IcosahedronGeometry(0.7, 2),
    new THREE.MeshStandardMaterial({
      color: "#cfd8ff",
      metalness: 0.9,
      roughness: 0.2,
      flatShading: true,
      emissive: "#6677ff",
      emissiveIntensity: 0.25,
    }),
    0,
    0.3,
    0,
  );
  add(
    g,
    new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6),
    mat("#8a929c", { metalness: 0.8 }),
    0,
    1.15,
    0,
  );
  return g;
}

function rubberDuck(): THREE.Group {
  const g = new THREE.Group();
  const yellow = mat("#ffd23f", { roughness: 0.45 });
  const body = add(
    g,
    new THREE.SphereGeometry(0.6, 18, 12),
    yellow,
    0,
    0,
    -0.1,
  );
  body.scale.set(1, 0.85, 1.25);
  add(g, new THREE.SphereGeometry(0.38, 16, 12), yellow, 0, 0.62, 0.35);
  const beak = add(
    g,
    new THREE.ConeGeometry(0.14, 0.3, 10),
    mat("#ff9d3c", { roughness: 0.4 }),
    0,
    0.58,
    0.75,
  );
  beak.rotation.x = Math.PI / 2;
  const black = mat("#14181c", { roughness: 0.3 });
  for (const side of [-1, 1]) {
    add(
      g,
      new THREE.SphereGeometry(0.05, 8, 6),
      black,
      side * 0.16,
      0.74,
      0.62,
    );
  }
  // Tail flip
  const tail = add(
    g,
    new THREE.SphereGeometry(0.22, 10, 8),
    yellow,
    0,
    0.22,
    -0.72,
  );
  tail.scale.set(0.7, 0.6, 1);
  tail.rotation.x = -0.7;
  return g;
}

function pizzaSlice(): THREE.Group {
  const g = new THREE.Group();
  const wedgeArc = 0.75;
  // Cheese wedge pointing +Z (cylinder theta 0 sits on +Z)
  add(
    g,
    new THREE.CylinderGeometry(
      1.15,
      1.15,
      0.12,
      12,
      1,
      false,
      -wedgeArc / 2,
      wedgeArc,
    ),
    mat("#ffd76e", { roughness: 0.6 }),
    0,
    0,
    -0.5,
  );
  // Crust: a torus arc hugging the wedge's outer edge. Euler XYZ applies
  // the Z spin first (centering the arc on +Y), then X(+90°) maps +Y
  // onto +Z — the side the wedge points at (X(-90°) strands it behind)
  const crust = add(
    g,
    new THREE.TorusGeometry(1.12, 0.12, 10, 12, wedgeArc),
    mat("#d99a4e"),
    0,
    0,
    -0.5,
  );
  crust.rotation.x = Math.PI / 2;
  crust.rotation.z = Math.PI / 2 - wedgeArc / 2;
  const pepperoni = mat("#c0392b", { roughness: 0.55 });
  for (const [a, r] of [
    [-0.16, 0.55],
    [0.18, 0.8],
    [0.02, 1],
  ]) {
    add(
      g,
      new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12),
      pepperoni,
      Math.sin(a) * r,
      0.07,
      Math.cos(a) * r - 0.5,
    );
  }
  return g;
}

function coffeeCup(): THREE.Group {
  const g = new THREE.Group();
  add(
    g,
    new THREE.CylinderGeometry(0.45, 0.36, 0.95, 18),
    mat("#f4f0ea", { roughness: 0.4 }),
    0,
    0.48,
    0,
  );
  add(
    g,
    new THREE.CylinderGeometry(0.46, 0.44, 0.16, 18),
    mat("#9e80f9"),
    0,
    0.62,
    0,
  );
  add(
    g,
    new THREE.CylinderGeometry(0.41, 0.41, 0.03, 18),
    mat("#5c3a21", { roughness: 0.35 }),
    0,
    0.955,
    0,
  );
  const handle = add(
    g,
    new THREE.TorusGeometry(0.24, 0.06, 8, 16),
    mat("#f4f0ea", { roughness: 0.4 }),
    0.48,
    0.5,
    0,
  );
  handle.rotation.y = Math.PI / 2;
  return g;
}

/** Build order = flyby order (JourneyCruise alternates them left/right
 *  and hands each its own stretch of the crawl). */
export const ARTIFACT_BUILDERS: Array<() => THREE.Group> = [
  saucer,
  martian,
  beloRausch,
  beloBabu,
  discoBall,
  rubberDuck,
  coffeeCup,
  pizzaSlice,
];

/** Benched cameos (the Bélos took their slots), kept around in case the
 *  lineup rotates again — knip: intentionally unused. */
export const BENCHED_ARTIFACT_BUILDERS = { cheeseburger, trafficCone };

/** Free every geometry/material under the group (builders never share
 *  resources across groups, so a plain traverse is safe). */
export function disposeArtifact(group: THREE.Group): void {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material.dispose();
  });
}
