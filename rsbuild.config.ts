import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSass } from "@rsbuild/plugin-sass";
import { pluginSvgr } from "@rsbuild/plugin-svgr";

export default defineConfig({
  output: {
    distPath: {
      root: "build",
    },
    manifest: true,
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
