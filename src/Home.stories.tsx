import type { Meta, StoryObj } from "@storybook/react";

import Home from "./Home";

/**
 * Home's DOM layer at each of the site's breakpoints.
 *
 * What these stories DO cover: the info panel, the social row, the typed
 * intro, the back link and the scroll hint — everything whose position is
 * decided by CSS, which is what a layout pass actually changes.
 *
 * What they do NOT cover: the asteroid/Earth/Sputnik link targets. Those
 * are DOM overlays that `BodyAnchors` glues to projected 3D positions each
 * frame (see CLAUDE.md), so without a live `SpaceCanvas` they render
 * unpositioned. Judge those against the real app, not here — pulling two
 * WebGL canvases into every story would make the harness slow and flaky
 * for no layout benefit.
 */
const meta = {
  title: "Pages/Home",
  component: Home,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The /home DOM overlay. 3D-anchored link targets (asteroids, " +
          "Earth, Sputnik) are inert here — they need a live canvas.",
      },
    },
  },
} satisfies Meta<typeof Home>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Phone. `useWindowSize` reports `sm`, so the compact summary line shows. */
export const Small: Story = {
  globals: { viewport: { value: "sm" } },
};

/** Tablet. First size that gets the full "Frontend Engineer based in…" line. */
export const Medium: Story = {
  globals: { viewport: { value: "md" } },
};

/** Laptop — the size the layout was originally tuned for. */
export const Large: Story = {
  globals: { viewport: { value: "lg" } },
};

/** Wide desktop. Same code path as `lg`; shows how much air opens up. */
export const ExtraLarge: Story = {
  globals: { viewport: { value: "xl" } },
};

/** Day palette at laptop width — every page has to hold up in both. */
export const LargeDay: Story = {
  globals: { viewport: { value: "lg" }, palette: "day" },
};
