# hunt.codes — CLAUDE.md

Andrew Hunt's personal site: a whimsical space-themed SPA with a three.js /
WebGL solar-system background.

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

- `corepack yarn storybook` — Storybook on port 6006 (`.claude/launch.json` has a
  `storybook` entry for the preview tool). Stories live next to their
  components (`src/**/*.stories.tsx`); `public/` is served so audio plays.
- `corepack yarn knip` — known false positives: `postcss`, `tw-animate-css`
  (used via CSS), `serve`, and a few intentionally-kept exports. Don't chase
  these.
- `yarn deploy` — S3 sync with `--profile andrew` (hashed assets immutable,
  HTML/manifest no-cache). Never deploy unprompted.
- `corepack yarn deploy:staging` — builds and deploys the Cloudflare Worker
  (`wrangler.jsonc`, entry `server/worker.mjs`) to **andysartifacts.com**,
  Andrew's 3D print shop domain (artifactandy.com 301s there), which also
  doubles as the staging copy of this build. On those hosts `/` 302s to
  `/shop` (`ROOT_REDIRECT` var); production keeps the landing page. Static
  assets come from `build/` with SPA fallback; `/api/*` currently proxies to
  the prod CloudFront API. hunt.codes itself is still AWS; the plan lives in
  `~/.claude/plans/consider-switching-this-app-dreamy-sunset.md`. Needs
  `wrangler login` once per machine.
- `./server/deploy.sh` — redeploy the `/api` Lambda after editing
  `server/handler.mjs` (no bundling; AWS SDK ships in the runtime)

## Routes & structure

- `/` → `Landing.tsx` — WebGL solar system; the sun is a clickable
  "ENTER" — the curved label is drawn in WebGL, and the SVG under it
  carries one transparent disc wide enough to be the link for both
  (`SUN_HIT_RADIUS`). On md+ (≥768px) the star-glyph title stacks in a
  left column (`HUNT.` / `CODES`, the later phrases likewise —
  `STACKED_LINES` in `starSampling.ts`), the sun parks at 75% of the
  width (`LANDING_SUN_X` in `CameraRig.tsx`), a tagline hangs under the
  title (`LandingTagline.tsx`) and the coin parks top-right
  (`body.on-landing` rules in App.scss, mirrored in
  `BadgeMedallion.tsx`); the music + view switches keep their usual
  bottom-left corner, and the scroll chevron sits the layout out. Phones
  keep the one-line banner.
- `/home` → `Home.tsx` — social links; Earth = "ABOUT ME" link; asteroids +
  Sputnik satellite = blog/LinkedIn/GitHub links (home view only). "ABOUT
  ME" and the landing's "ENTER" are one pair of curved ring labels and
  share their proportions (`src/ringLabel.ts`) — size one and you size
  both.
- `/about` → `Resume.tsx` — the résumé page (frosted panel over the scene)
- `/artifacts` → the shop, over the "artifacts" solar view: the camera
  perches over the moon's limb (the about view's Earth-perch, scaled to
  the moon) on the far side from Mars, swinging around the moon to keep
  Mars in the background and holding its heading while Mars is behind
  the sun or a planet (`CameraRig.tsx`, `marsBlocked`)
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

Space/Mesh is a user toggle in `App.tsx` (`.App.space` / `.App.mesh` on
the root). The landing page always opens in space, and `VIEW_TOUR` flips
to mesh on the `/` → `/home` hop and back on the return — until the
visitor works the switch themselves, after which their pick holds for the
session and is the only one remembered in `localStorage` (other entry
points open in it). Space is the
photographed scene, mesh redraws every 3D body as a glowing wire lattice
(and the sun as a gold mirror ball) over a dark graticule ground. Both grounds are dark, so the
two share one palette — there are no per-view text overrides left, and
`.App.mesh` carries only the backdrop. The view is called "space", not
"satellite", because the scene already has a satellite in it (Sputnik,
the /projects-and-toys link) — don't rename the `SATELLITE_*` constants
or `satellite-link`, which are that body.

The 3D scene's internals — the two-canvas architecture, the mesh-view
shader patch, and the orbital/squash/corona invariants — live in
`src/space3d/CLAUDE.md`, which loads automatically when working under
`src/space3d/`.

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
  to it.
- The preview tool throttles rAF while hidden: frame-driven intros (star
  fade-in, camera swoops) advance ~5 frames per screenshot, so "missing"
  stars/labels are usually just a starved clock, not a bug. If a
  screenshot renders tiny/scrambled after navigation, call `preview_resize`
  and capture again.
