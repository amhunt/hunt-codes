import { defineConfig, type RsbuildPlugin } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSass } from "@rsbuild/plugin-sass";
import { pluginSvgr } from "@rsbuild/plugin-svgr";

import { PUBLIC_ROUTES, SITE_ORIGIN } from "./src/routes";

// sitemap.xml is emitted from the route table rather than kept in public/:
// the hand-maintained copy had to be remembered for every new page, and
// its lastmod dates went stale within a month of being written. No
// lastmod on purpose — search engines only trust it when it's reliably
// accurate, and per-route change dates aren't something this build knows.
const pluginSitemap = (): RsbuildPlugin => ({
  name: "hunt-codes:sitemap",
  setup(api) {
    api.processAssets({ stage: "additional" }, ({ compilation, sources }) => {
      const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...PUBLIC_ROUTES.flatMap(({ path, priority }) => [
          "  <url>",
          `    <loc>${SITE_ORIGIN}${path}</loc>`,
          `    <priority>${priority.toFixed(1)}</priority>`,
          "  </url>",
        ]),
        "</urlset>",
        "",
      ];
      compilation.emitAsset(
        "sitemap.xml",
        new sources.RawSource(lines.join("\n")),
      );
    });
  },
});

export default defineConfig({
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    // The /api Lambda (see server/) only exists in prod — point local
    // /draw at the live API so dev works end to end. Must be www: the
    // apex is a Squarespace 302 to www, which a proxied fetch can't follow
    proxy: {
      "/api": {
        target: "https://www.hunt.codes",
        changeOrigin: true,
      },
    },
  },
  output: {
    distPath: {
      root: "build",
    },
    // Emit the build asset manifest under a distinct name so it does not
    // collide with the PWA manifest served at /site.webmanifest.
    manifest: "asset-manifest.json",
    // Emit external JS source maps in production so tooling (and Lighthouse's
    // "valid source maps" audit) can map the minified bundles back to source.
    sourceMap: {
      js: "source-map",
    },
  },
  html: {
    // rsbuild auto-injects <link rel="icon" href="/favicon.ico"> from public/;
    // the template declares the additional SVG / PNG / apple-touch icons.
    template: "public/index.html",
  },
  source: {
    entry: {
      index: "./src/index.js",
    },
    // Binary 3D assets (the badge medallion GLB) ship as hashed static
    // assets, so the deploy's 1-year immutable caching is safe for them
    assetsInclude: /\.glb$/,
  },
  plugins: [
    pluginReact(),
    pluginSass(),
    // pluginEslint({
    //   eslintPluginOptions: { overrideConfig: eslintConfig },
    // }),
    pluginSvgr(),
    pluginSitemap(),
  ],
});
