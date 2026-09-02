# hunt.codes — CLAUDE.md

Andrew Hunt's personal site: a whimsical space-themed SPA. React 19 +
react-router v7 + TypeScript + rsbuild + Tailwind v4 (via `@tailwindcss`
import in `src/index.css`) + SCSS (`src/App.scss`) + three.js /
@react-three/fiber for the WebGL solar-system background.

## Environment gotcha (read first)

The default shell resolves an **old node (v20.10)** that breaks nearly
everything: rspack refuses to start, eslint/knip crash, and the husky
pre-commit hook (lint-staged → listr2 needs `styleText`) **fails commits**.
Before ANY yarn command — including `git commit` — put a modern node on
PATH:

```sh
export PATH="$(ls -d $HOME/.nvm/versions/node/*/bin | sort -V | tail -1):$PATH"
```

`.nvmrc` may name a version that isn't installed; the newest installed nvm
node works. `.claude/launch.json` already wraps `yarn start` this way for
the preview tool.

## Commands

- `corepack yarn start` — rsbuild dev server (port 3000, HMR)
- `corepack yarn tsc --noEmit` / `corepack yarn lint` / `corepack yarn build`
  — run all three to verify changes
- `corepack yarn test` — runs `bun test` (see "Testing preferences")
- `corepack yarn storybook` — Storybook on port 6006 (`.claude/launch.json` has a
  `storybook` entry for the preview tool). Stories live next to their
  components (`src/**/*.stories.tsx`); `public/` is served so audio plays.
- `corepack yarn knip` — known false positives: `postcss`, `tw-animate-css`
  (used via CSS), `serve`, and a few intentionally-kept exports. Don't chase
  these.
- `yarn deploy` — S3 sync with `--profile andrew` (hashed assets immutable,
  HTML/manifest no-cache). Never deploy unprompted.
- `./server/deploy.sh` — redeploy the `/api` Lambda after editing
  `server/handler.mjs` (no bundling; AWS SDK ships in the runtime)

## Routes & structure

- `/` → `Landing.tsx` — WebGL solar system; the sun is a clickable "ENTER"
- `/home` → `Home.tsx` — social links; Earth = "ABOUT ME" link; asteroids +
  Sputnik satellite = blog/LinkedIn/GitHub links (home view only)
- `/about` → `Resume.tsx` — the résumé page (frosted panel over the scene)
- `/draw` → `SvgGenerator.tsx` — AI SVG generator; `/draw/:id` are
  shareable permalinks. Backed by the `/api` Lambda (see `server/`), not a
  browser-side key. **Other people's drawings render as inert
  `data:image/svg+xml` `<img>` — never inline them as markup** (a review
  broke the server-side regex allowlist three ways; the `<img>` isolation
  is the real XSS gate). See `server/README.md`.
- Confetti/ribbons (tsParticles) load through `src/celebration.ts`: the
  shared engine throws if a plugin registers after anything has loaded,
  so every effect registers both plugin sets up front via that loader.
  Never `import("@tsparticles/confetti")` directly. A live container keeps
  a fullscreen 2D canvas clearing at up to 120fps over the WebGL scenes, so
  destroy containers once their effect has drained (Resume on unmount; the
  coin volley in `badgeConfetti.ts` polls its own container empty — it has
  its own id so /about's teardown can't cut a volley short).
- There is no `public/sitemap.xml`: `pluginSitemap` in `rsbuild.config.ts`
  emits it from `PUBLIC_ROUTES` in `src/routes.ts`, the same list that
  supplies each page's tab title. A new public page goes in that list
  (title + priority) and gets its `<Route>` in `App.tsx`.

Day/night is a user toggle in `App.tsx` (night default); every page must
stay legible in both palettes (`.App.night` / `.App.day` overrides).

## 3D architecture (src/space3d/)

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

Invariants worth knowing:
- `SPEED_SCALE` in `solar/constants.ts` is the global orbital tempo; the
  asteroids must orbit at exactly `EARTH.orbitSpeed` (the home camera
  co-rotates with Earth, freezing them on screen).
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

## Performance rules (learned the hard way)

- **Never put `backdrop-filter` over the animated canvases** — a blurred
  panel forces a backdrop re-capture every canvas AND scroll frame; it
  froze the /about background. Use higher-opacity backgrounds instead.
- Canvas DPR is capped at 1.5; the star canvas runs without MSAA (point
  sprites don't benefit). Keep `powerPreference: "high-performance"`.
- Shader-heavy sun effects self-regulate by pixel coverage — the sun is
  only big on /home — so view-gating is unnecessary.
- Fullscreen CSS `filter` animations must not run on invisible layers
  (see `.App-background_day.off`), and looping animations need
  `prefers-reduced-motion` coverage (one shared block in App.scss).

## Content facts & intentional quirks

- Andrew is an independent consultant in **NYC**; he **left Zip in 2025**
  (staff engineer). Past roles correctly say San Francisco — history, not
  stale copy.
- **Easter eggs are intentional — do not "clean up":** the
  `console.log("bro what r u doing in the console...")` in App.tsx, and
  the unused-but-kept `Logo.tsx` / `RetroMac.tsx` (knip flags them; leave
  them).
- The interests pill list in Resume.tsx pairs with `nth-of-type` animation
  delays in App.scss — keep counts in sync.
- Site voice is playful; preserve it when editing copy or UI.

## Testing preferences

- Verify with `tsc` + `lint` + `build`; keep browser/visual checking under
  ~2 minutes — Andrew tests visually himself. Screenshots are optional
  confirmation, not proof.
- The test runner is **Bun**, not jest: `bunfig.toml` preloads `happydom.ts`,
  specs import from `bun:test`, and CI runs `bun test`. `yarn test` is wired
  to it. There is exactly one smoke test (`src/App.test.js`).
- The preview tool throttles rAF while hidden: frame-driven intros (star
  fade-in, camera swoops) advance ~5 frames per screenshot, so "missing"
  stars/labels are usually just a starved clock, not a bug. If a
  screenshot renders tiny/scrambled after navigation, call `preview_resize`
  and capture again.
