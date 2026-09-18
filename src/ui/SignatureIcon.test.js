import React, { act } from "react";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createRoot } from "react-dom/client";
import { ShoppingBag } from "lucide-react";

import SignatureIcon from "./SignatureIcon";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** The artwork the icon is cut from: the coin's and the favicon's "A" */
const artwork = readFileSync(
  new URL("../../public/signature-a.svg", import.meta.url),
  "utf8",
);

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

const render = (node) => act(async () => root.render(node));
const box = (svg) =>
  ["width", "height", "viewBox"].map((name) => svg.getAttribute(name));

test("lands in the same box as an imported lucide icon at any size", async () => {
  await render(
    <>
      <SignatureIcon size={20} data-testid="signature" />
      <ShoppingBag size={20} data-testid="bag" />
      <SignatureIcon data-testid="signature-default" />
    </>,
  );
  const find = (id) => container.querySelector(`[data-testid="${id}"]`);
  expect(box(find("signature"))).toEqual(box(find("bag")));
  expect(box(find("signature"))).toEqual(["20", "20", "0 0 24 24"]);
  // lucide's default, untouched
  expect(box(find("signature-default"))).toEqual(["24", "24", "0 0 24 24"]);
});

test("draws the signature artwork's own path, filled with the text colour", async () => {
  await render(<SignatureIcon />);
  const path = container.querySelector("svg path");
  expect(path.getAttribute("d")).toBe(artwork.match(/ d="([^"]+)"/)[1]);
  expect(path.getAttribute("fill")).toBe("currentColor");
  expect(path.getAttribute("stroke")).toBe("none");
  // Decorative, like every other lucide icon: the link names itself
  expect(container.querySelector("svg").getAttribute("aria-hidden")).toBe(
    "true",
  );
});

test("the glyph is centred in lucide's live area, as tall as the grid allows", async () => {
  await render(<SignatureIcon />);
  const [, width, height] = artwork
    .match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
    .map(Number);
  const [, x, y, scale] = container
    .querySelector("svg path")
    .getAttribute("transform")
    .match(/translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/)
    .map(Number);
  const right = x + width * scale;
  const bottom = y + height * scale;
  // lucide keeps 1 unit of padding inside its 24-unit grid
  expect(y).toBeCloseTo(1, 2);
  expect(bottom).toBeCloseTo(23, 2);
  expect(x).toBeGreaterThanOrEqual(1);
  expect(right).toBeLessThanOrEqual(23);
  expect(x + right).toBeCloseTo(24, 2);
});
