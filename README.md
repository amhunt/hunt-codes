# hunt.codes

My personal website — a whimsical space-themed SPA with a three.js /
@react-three/fiber solar system humming in the background.

Built with React 19, react-router v7, TypeScript, [rsbuild](https://rsbuild.rs),
Tailwind v4, and SCSS.

## Development

Requires node ≥ 22 (see `.nvmrc`) and yarn via corepack.

- `yarn start` — dev server at [http://localhost:3000](http://localhost:3000) (HMR)
- `yarn build` — production build to `build/`
- `yarn lint` / `yarn tsc --noEmit` — lint + typecheck
- `yarn test` — run tests (CI runs them via `bun test`)
- `yarn serve` — serve the production build locally
- `yarn deploy` — sync `build/` to S3 (hashed assets cached immutable, HTML/manifest no-cache)
