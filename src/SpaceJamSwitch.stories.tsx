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
 * The switch starts off, so the default story is the muted dressing —
 * and two seconds in, the tooltip opens on its own to advertise that
 * there is something to hear, which is the `Hint` story below. Flipping
 * it by hand starts the generative pad for real.
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

/** The resting state: charcoal track, flatline, slashed note. */
export const Muted: Story = {};

/** After a flip on: purple track, equaliser, note. */
export const Playing: Story = {
  play: async ({ canvasElement }) => {
    const toggle = within(canvasElement).getByRole("switch", {
      name: "Space jams",
    });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-checked", "true");
  },
};

/**
 * The unprompted advert, two seconds after load. Waits it out rather than
 * hovering, so this is the tooltip opening on its own rather than the
 * "Play space jams" label a hover would bring up.
 */
export const Hint: Story = {
  play: async () => {
    // Radix portals its tooltip to the body, outside the story canvas
    const hint = await within(document.body).findByText(
      "Enable sound for the full experience",
      undefined,
      { timeout: 5000 },
    );
    await expect(hint).toBeVisible();
  },
};

/** Mesh view, muted — the charcoal track over the wire-scene ground. */
export const MutedMesh: Story = {
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
