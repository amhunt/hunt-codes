# AGENTS.md

See `CLAUDE.md` for a full tour of the codebase (architecture, routes, 3D
internals, content facts) and `README.md` for the standard command list.
This file only records durable, non-obvious notes for agents.

## Cursor Cloud specific instructions

Single service: a client-only SPA (React 19 + rsbuild + TypeScript, Yarn 4
via Corepack). No backend / database. Dependencies are already installed by
the startup update script (`corepack enable` + `yarn install --immutable`).

- Use `yarn` (Corepack shim → 4.6.0) — after `corepack enable`, plain
  `yarn` resolves to 4.6.0 in this repo. Commands: `yarn start` (rsbuild dev
  on http://localhost:3000, HMR), `yarn build`, `yarn lint`,
  `yarn tsc --noEmit`. See `README.md`.
- Tests run with **`bun test`**, not `yarn test`. `yarn test` (jest) is
  intentionally broken — its `package.json` config points at
  `config/jest/babelTransform.js`, which does not exist. The real runner is
  Bun (`bunfig.toml` preloads `happydom.ts`; CI uses `bun test`). Bun is
  installed in this environment and on `PATH`.
- The Node gotcha in `CLAUDE.md` (about an old node v20.10 requiring a PATH
  prepend before yarn commands) does **not** apply in the cloud VM: the
  default `node` is v22.14.0, which satisfies `engines` (`>22`) and runs
  install / lint / tsc / build / dev / `bun test` cleanly. No nvm PATH
  juggling is needed here despite `.nvmrc` naming 24.18.0.
- `yarn install` warns about eslint peer-dependency ranges and a few build
  scripts (`unrs-resolver`, `core-js`, `@parcel/watcher`); these warnings
  are harmless.
