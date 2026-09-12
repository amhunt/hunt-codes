# src/space3d — 3D scene internals

Loads when working under `src/space3d/`. The site-wide rules (Space/Mesh
toggle, performance rules, easter eggs) stay in the root `CLAUDE.md`.

## Architecture

Two independent fullscreen canvases, both `pointer-events: none`:

- `SpaceCanvas` + `StarField` — orthographic, world units = CSS px. Two
  point clouds: static background stars (pan/wrap with camera rotation via
  `starPan.ts`) and the landing "text stars" (glyph layout + cursor
  gravity; must NOT pan).
- `solar/SolarScene` — perspective sun/planets/moon. `CameraRig` swoops
  between views and accumulates star-pan rotation deltas.

Clickable 3D bodies use DOM overlays glued to projections each frame
(`BodyAnchors`, `SunSvgAnchor`); hover state flows through plain mutable
modules (`solarHover.ts`, `starPan.ts`, `sunState`/`rigState` in
`constants.ts`) — not React state, which would be too slow at 60fps.
Hover outlines share one pattern: `writeSilhouette` (convex hull of
projected verts) → `.body-outline` SVG paths in `SolarOverlays.tsx`.

## Invariants worth knowing

- `SPEED_SCALE` in `solar/constants.ts` is the global orbital tempo; the
  asteroids must orbit at exactly `EARTH.orbitSpeed` (the home camera
  co-rotates with Earth, freezing them on screen).
- Planet orbit speeds are derived, not tuned: `orbit(r)` in
  `solar/constants.ts` hands back the radius with the speed Kepler's
  third law gives it off Earth's, so moving an orbit radius re-times that
  orbit automatically. Don't reintroduce a hand-set `orbitSpeed` — the
  asteroids, which share Earth's, are the only bodies exempt. Planet
  radii come off `EARTH_RADIUS` by the real km ratio the same way.
- Orbits sweep +X → +Z, which is a turn about **-Y**, while a positive
  `rotation.y` turns about +Y — the two senses are opposite. So a
  `spinSpeed` is prograde-positive and both `Planet.tsx` and `Moon.tsx`
  negate it on the way into `rotation.y`; dropping either negation spins
  that body backwards against its own orbit, which is what the whole
  scene used to do. `Asteroid.tsx` is the exception — its rocks only
  tumble for looks, so it spins on the raw sign.
- The moon is tidally locked at `spinSpeed: MOON.orbitSpeed`, one
  rotation per orbit, and `Moon.tsx` writes `rotation.y` absolutely off
  `clock.elapsedTime` rather than `+=`-ing frame deltas so the lock can't
  drift out of true. `MOON.spinPhase` squares the near side onto Earth.
- The planets carry their real axial tilt, and `Planet.tsx` sets
  `rotation-order="ZYX"` so the composed rotation is Rz(tilt)·Ry(spin) —
  a spin about the tilted pole. The default XYZ order composes the other
  way and precesses the pole into a wobble. Venus's retrograde spin comes
  from its ~177° tilt, so its `spinSpeed` is positive; negating it too
  would cancel back to prograde.
- `offAxisSquash` must apply R·S·R⁻¹ (wrapper rotation + inner
  counter-rotation); dropping the counter-rotation reorients textured
  globes (Earth reads upside down) — regression to watch for.
- The flare corona is a back-side 3D shell around the sun; the shader
  derives the limb per fragment from the view ray's distance to the
  center (impact parameter b: tangent rays have b = R exactly), so it
  aligns with the silhouette by construction. Don't replace it with a
  billboard — screen-space anchoring drifted twice.
- Fade-in ramps write material opacity from `useFrame`; anything guarded
  by "only when changed" needs a first-frame initialization (JSX materials
  mount at opacity 1).

## Mesh view (wire skin)

Mesh view is a shader patch, not a material swap or wireframe geometry
(`solar/wireSkin.ts`): `EdgesGeometry` returns zero segments on a sphere
and `material.wireframe` on Earth's 96x96 globe is 54,720 segments of
haze. `applyWireSkin` folds a derivative-based lat/long grid (or, with
`grid: "box"`, a cartesian lattice — flat and boxy parts like the
scroll and the 808 read as a web under lat/long) plus a fresnel rim
into each body's own material — and, for the planets and moon
(`sunlit`), dims the wires on the side facing away from the sun at the
world origin — and the bodies go additive
with `depthWrite` off so they are genuinely see-through. One shared
`uWire` uniform crossfades the whole scene; `solar/WireDriver.tsx` is
mounted once per canvas (the corner coin lives in the star canvas and
takes the skin too, mark excepted), and the fade runs off the clock so
the two drivers agree.
A material has only one `onBeforeCompile`, so the wire skin and the
energy wave both register through `solar/materialHooks.ts`, which keeps
them in a defined order (wires first, band on top) and builds a cache key
naming both. Things carrying live state stay solid: the satellite's video
screen, the synth's oscilloscope steppers. Things told apart by color
keep it as a wire tint: the 808's pad rows, the satellite's four part
links, the six synth knob-planets. The sun never takes the wire skin at
all: its own surface shader crossfades to a gold mirror ball (the `uMesh`
branch in `solar/sunShaders.ts` — procedural tiles reflecting a
procedural room, since the scene has no environment map), and it stays
solid because its depth buffer is what culls the far half of the corona
shell. The neon wire cage it replaced is still compiled in behind
`MESH_SUN_STYLE` / the `uMeshStyle` uniform, parked for an easter egg.
