import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSass } from "@rsbuild/plugin-sass";
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
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
  },
  plugins: [
    pluginReact(),
    pluginSass(),
    // pluginEslint({
    //   eslintPluginOptions: { overrideConfig: eslintConfig },
    // }),
    pluginSvgr(),
  ],
});
