import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, spyOn, userEvent, within } from "storybook/test";

import ViewModeSwitch from "./ViewModeSwitch";
import SpaceJamSwitch from "./SpaceJamSwitch";

/**
 * The bottom-left music switch, with its muted (red-slashed speaker,
 * flatline) and playing (speaker, bouncing equaliser) dressings. Hovering
 * or focusing it shows the "Play space jams" / "Pause space jams" tooltip.
 * The toolbar view switch (`.App.satellite` / `.App.mesh`) shows it over
 * both backdrops.
 *
 * Flipping the switch by hand plays the real track (`public/` is served
 * as Storybook's static dir).
 */
const meta = {
  title: "Controls/Space jam switch",
  component: SpaceJamSwitch,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SpaceJamSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The resting state: charcoal track, flatline, slashed speaker. */
export const Muted: Story = {};

/**
 * After a flip on: purple track, equaliser, speaker. The click here is
 * synthetic, so the browser would refuse `play()` and the switch would
 * honestly fall back to muted — stub playback so the dressing can be
 * judged (listen for real in the Muted story).
 */
export const Playing: Story = {
  play: async ({ canvasElement }) => {
    const play = spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    try {
      const toggle = within(canvasElement).getByRole("switch", {
        name: "Space jams",
      });
      await userEvent.click(toggle);
      await expect(toggle).toHaveAttribute("aria-checked", "true");
    } finally {
      play.mockRestore();
    }
  },
};

/** Mesh view, muted — the charcoal track over the wire-scene ground. */
export const MutedMesh: Story = {
  globals: { palette: "mesh" },
};

const ControlRow = () => {
  const [isSatelliteView, setIsSatelliteView] = useState(true);
  return (
    <>
      <SpaceJamSwitch />
      <ViewModeSwitch
        isSatelliteView={isSatelliteView}
        onChange={setIsSatelliteView}
      />
    </>
  );
};

/**
 * Laptop width, where the Satellite/Mesh switch leaves the top-right
 * corner and joins the music switch in a bottom-left control row. Checks
 * the two sit level and the gap between them (`.view-mode-switch`'s lg
 * `left` is the music switch's width plus a gap).
 */
export const ControlRowLarge: Story = {
  globals: { viewport: { value: "lg" } },
  render: () => <ControlRow />,
};
