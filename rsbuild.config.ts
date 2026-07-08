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
    manifest: true,
    // Emit external JS source maps in production so tooling (and Lighthouse's
    // "valid source maps" audit) can map the minified bundles back to source.
    sourceMap: {
      js: "source-map",
    },
  },
  html: {
    template: "public/index.html",
    favicon: "public/favicon.ico",
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
