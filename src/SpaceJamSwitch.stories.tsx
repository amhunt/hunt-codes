import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";

import ViewModeSwitch from "./ViewModeSwitch";
import SpaceJamSwitch from "./SpaceJamSwitch";

/**
 * The bottom-left music switch, with its playing (note, bouncing
 * equaliser) and muted (red-slashed note, flatline) dressings. Hovering
 * or focusing it shows the "Play space jams" / "Pause space jams" tooltip.
 * The toolbar view switch (`.App.space` / `.App.mesh`) shows it over
 * both backdrops.
 *
 * The switch starts on, so the default story is the playing dressing —
 * silently, since autoplay policy refuses a cold `play()` and the switch
 * deliberately shows intent rather than flipping itself off. Interacting
 * with the page starts the real track (`public/` is served as Storybook's
 * static dir).
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

/** The resting state: purple track, equaliser, note. */
export const Playing: Story = {};

/**
 * After a flip off: charcoal track, flatline, slashed note. `pause()` is
 * synchronous and always allowed, so unlike the way on there is nothing
 * to stub here.
 */
export const Muted: Story = {
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByRole("switch", {
      name: "Space jams",
    });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  },
};

/** Mesh view, playing — the purple track over the wire-scene ground. */
export const PlayingMesh: Story = {
  globals: { palette: "mesh" },
};

const ControlRow = () => {
  const [isSpaceView, setIsSpaceView] = useState(true);
  return (
    <>
      <SpaceJamSwitch />
      <ViewModeSwitch isSpaceView={isSpaceView} onChange={setIsSpaceView} />
    </>
  );
};

/**
 * Laptop width, where the Space/Mesh switch leaves the top-right
 * corner and joins the music switch in a bottom-left control row. Checks
 * the two sit level and the gap between them (`.view-mode-switch`'s lg
 * `left` is the music switch's width plus a gap).
 */
export const ControlRowLarge: Story = {
  globals: { viewport: { value: "lg" } },
  render: () => <ControlRow />,
};
