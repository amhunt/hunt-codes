import React, { act } from "react";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import Brand2CaseStudy from "./Brand2CaseStudy";
import { SITE_ORIGIN } from "./routes";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const markdown = readFileSync(
  new URL("../docs/case-studies/brand-2.md", import.meta.url),
  "utf8",
);
const normalize = (value) => value.replaceAll(/\s+/g, " ").trim();
const text = (node) => normalize(node.textContent);
// Remove only inline Markdown notation. Exact sentences and punctuation must
// still agree, while links and image paths are checked separately below.
const referenceText = normalize(
  markdown
    .replaceAll(/!?\[([^\]]+)\]\([^\n)]+\)/g, "$1")
    .replaceAll("**", "")
    .replaceAll("`", ""),
);

let container;
let root;

beforeEach(async () => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter>
        <Brand2CaseStudy />
      </MemoryRouter>,
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test("the public Markdown preserves all semantic page copy", () => {
  const selectors = [
    "h1, h2, h3",
    "p:not(.case-study-crumbs):not(.case-study-facts)",
    ".case-study-crumbs > span:not([aria-hidden])",
    ".case-study-facts > span",
    "dt, dd, figcaption, caption, th, td",
    ".case-study-cards > li > strong",
  ].join(", ");
  const blocks = [...container.querySelectorAll(selectors)];
  // Card lists have a separate title and paragraph; other list items contain
  // one semantic statement, including each dated milestone and takeaway.
  blocks.push(
    ...[...container.querySelectorAll("li")].filter(
      (item) => !item.querySelector("p, li"),
    ),
  );

  expect(blocks.length).toBeGreaterThan(100);
  for (const block of blocks) {
    if (block.closest('[aria-hidden="true"]')) continue;
    expect(referenceText).toContain(text(block));
  }

  for (const stat of container.querySelectorAll(".case-study-stats > div")) {
    expect(referenceText).toContain(
      `${text(stat.querySelector("dt"))}: ${text(stat.querySelector("dd"))}`,
    );
  }

  // Check complete rows as well as individual cells so a number cannot pass
  // merely because it belongs to a different cleanup PR elsewhere in the MD.
  const markdownRows = markdown
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) => line.split("|").map(normalize).filter(Boolean));
  for (const row of container.querySelectorAll("table tr")) {
    expect(markdownRows).toContainEqual([...row.cells].map(text));
  }
});

test("the public Markdown preserves navigation and image descriptions", () => {
  for (const link of container.querySelectorAll("a")) {
    const href = link.getAttribute("href");
    // Root-relative routes need the public origin in GitHub-rendered Markdown;
    // fragment, mailto and external destinations retain their page semantics.
    const destination = href.startsWith("/")
      ? new URL(href, SITE_ORIGIN).href
      : href;
    expect(markdown).toContain(`[${text(link)}](${destination})`);
  }
  for (const navigation of container.querySelectorAll("nav[aria-label]")) {
    expect(referenceText).toContain(navigation.getAttribute("aria-label"));
  }
  for (const image of container.querySelectorAll("img")) {
    expect(markdown).toContain(
      `![${image.alt}](../../src/assets/brand2/${basename(image.getAttribute("src"))})`,
    );
  }
  for (const heading of container.querySelectorAll("h2[id]")) {
    expect(markdown).toContain(`<a id="${heading.id}"></a>`);
  }
});
