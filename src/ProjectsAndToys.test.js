import React, { act } from "react";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import ProjectsAndToys from "./ProjectsAndToys";
import { ZIP_BLOG_POST_URL } from "./workLinks";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const render = () =>
  act(async () => {
    root.render(
      <MemoryRouter>
        <ProjectsAndToys />
      </MemoryRouter>,
    );
  });

const cards = () => [...container.querySelectorAll(".work-card")];
const text = (node, selector) =>
  node.querySelector(selector)?.textContent.trim() ?? null;

test("every project and toy is a card, filed by kind in its corner tag", async () => {
  await render();
  expect(
    cards().map((card) => [
      text(card, ".work-card-title"),
      text(card, ".work-card-tag"),
    ]),
  ).toEqual([
    ["SVG Studio", "Toy"],
    ["Space Synth", "Toy"],
    ["SVG → 3D", "Tool"],
    ["Artifacts by Andy", "Shop"],
    ["Zip brand launch video", "Video"],
    ["Rewriting our component library with Material UI", "Blog post"],
  ]);
  // Each card carries an icon and a subtitle
  for (const card of cards()) {
    expect(card.querySelector(".work-card-icon svg")).not.toBeNull();
    expect(text(card, ".work-card-subtitle")).not.toBe("");
  }
});

test("the cards go where the satellite's parts used to", async () => {
  await render();
  const byTitle = (title) =>
    cards().find((card) => text(card, ".work-card-title") === title);
  expect(byTitle("SVG Studio").getAttribute("href")).toBe("/draw");
  expect(byTitle("SVG → 3D").getAttribute("href")).toBe("/svg-to-3d");
  expect(byTitle("Artifacts by Andy").getAttribute("href")).toBe("/artifacts");
  // The synth and the reel are buttons: one boards the 808 ride, the
  // other opens the popover
  expect(byTitle("Space Synth").tagName).toBe("BUTTON");
  expect(byTitle("Zip brand launch video").tagName).toBe("BUTTON");
  // The blog post leaves the site, flagged with the arrow
  const post = byTitle("Rewriting our component library with Material UI");
  expect(post.getAttribute("href")).toBe(ZIP_BLOG_POST_URL);
  expect(post.getAttribute("target")).toBe("_blank");
  expect(post.querySelector(".work-card-external")).not.toBeNull();
});

test("the reel card opens the shared popover, which hides the panel", async () => {
  await render();
  expect(document.querySelector("video")).toBeNull();
  const reel = cards().find(
    (card) => text(card, ".work-card-title") === "Zip brand launch video",
  );
  await act(async () => reel.click());
  expect(document.querySelector("video")).not.toBeNull();
  expect(document.body.classList.contains("video-mode")).toBe(true);
});

test("no 3D overlays are left on the page", async () => {
  await render();
  expect(container.querySelector(".satellite-link")).toBeNull();
  expect(container.querySelector(".projects-panel")).not.toBeNull();
});
