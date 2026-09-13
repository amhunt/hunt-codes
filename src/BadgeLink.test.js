import React, { act } from "react";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import BadgeLink from "./BadgeLink";
import { RDP_CASE_STUDY_PATH } from "./routes";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

beforeEach(() => {
  window.happyDOM.settings.device.prefersReducedMotion = "no-preference";
  window.happyDOM.setViewport({ width: 1280, height: 720 });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  window.happyDOM.settings.device.prefersReducedMotion = "no-preference";
  window.happyDOM.setViewport({ width: 1024, height: 768 });
});

async function renderBadge() {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[RDP_CASE_STUDY_PATH]}>
        <BadgeLink />
      </MemoryRouter>,
    );
  });
}

const badge = () =>
  container.querySelector('button[aria-label="Fire the confetti"]');

test("the case-study badge target follows the visible-medallion breakpoint", async () => {
  await renderBadge();
  expect(badge()).not.toBeNull();

  await act(async () => {
    window.happyDOM.setViewport({ width: 390, height: 844 });
  });
  expect(badge()).toBeNull();

  await act(async () => {
    window.happyDOM.setViewport({ width: 767, height: 844 });
  });
  expect(badge()).toBeNull();

  await act(async () => {
    window.happyDOM.setViewport({ width: 768, height: 844 });
  });
  expect(badge()).not.toBeNull();
});

test("reduced motion keeps the case-study confetti target out of the tab order", async () => {
  window.happyDOM.settings.device.prefersReducedMotion = "reduce";
  await renderBadge();

  expect(badge()).toBeNull();
});
