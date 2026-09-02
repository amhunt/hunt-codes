import type { StorybookConfig } from "storybook-react-rsbuild";

/**
 * Storybook runs on the same rsbuild toolchain as the site (via
 * storybook-react-rsbuild), so stories compile with the project's real
 * Sass, Tailwind and path aliases rather than a parallel bundler config
 * that would drift.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  // The site's static assets (the space-jam track lives here), so the
  // music switch story can actually play
  staticDirs: ["../public"],
  addons: [],
  framework: {
    name: "storybook-react-rsbuild",
    options: {},
  },
  typescript: {
    // The site's own tsc run is the type gate; docgen here would parse
    // every three.js-touching module for no benefit
    reactDocgen: false,
  },
};

export default config;
