import React, { act } from "react";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import Brand2CaseStudy from "./Brand2CaseStudy";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const normalize = (node) => node.textContent.replaceAll(/\s+/g, " ").trim();

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function renderCaseStudy() {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <Brand2CaseStudy />
      </MemoryRouter>,
    );
  });
}

test("labels approximate scope separately from the confirmed zero-reference endpoint", async () => {
  await renderCaseStudy();

  expect(normalize(container.querySelector("h1"))).toBe(
    "Rebranding a live enterprise app, one flag at a time",
  );
  expect(
    [...container.querySelectorAll(".case-study-stats dd")].map(normalize),
  ).toEqual(["~20", "100+", "~12", "0"]);
  expect(normalize(container.querySelector("header"))).toContain(
    "Component counts are my approximate project-wide totals, not individual output; the categories may overlap.",
  );
  expect(normalize(container.querySelector("header"))).not.toContain("1,800");
});

test("tells the rollout as a timeline and the cleanup as a chart with an accessible table", async () => {
  await renderCaseStudy();

  const milestones = container.querySelectorAll(".case-study-timeline > li");
  expect(milestones.length).toBe(13);
  expect(normalize(milestones[0].querySelector("time"))).toBe("Jul 2024");
  expect(normalize(milestones[12].querySelector("time"))).toBe("Jan 13–14");
  expect(normalize(milestones[4])).toContain("duplicate job is removed");
  expect(normalize(milestones[5])).toContain("remain separately gated");
  expect(normalize(milestones[8])).toContain("ahead of toggle removal");
  expect(normalize(milestones[11])).toContain("not the end of all Brand work");

  const chart = container.querySelector(".rdp-chart");
  expect(chart.getAttribute("aria-hidden")).toBe("true");
  expect(chart.querySelectorAll(".rdp-bar").length).toBe(9);
  const figure = chart.closest("figure");
  expect(figure.querySelector("table").parentElement.className).toBe("sr-only");
  expect(normalize(figure.querySelector("table caption"))).toBe(
    normalize(figure.querySelector("figcaption")),
  );
  expect(figure.querySelectorAll("tbody tr").length).toBe(9);
  const totals = [...figure.querySelectorAll("tbody tr")].reduce(
    (sum, row) => {
      const cells = [...row.querySelectorAll("td")].map((cell) =>
        Number(normalize(cell).replaceAll(",", "")),
      );
      return [sum[0] + cells[0], sum[1] + cells[1]];
    },
    [0, 0],
  );
  expect(totals).toEqual([15952, 4129]);
  expect(normalize(figure.nextElementSibling)).toContain("11,823");
  expect(normalize(figure.nextElementSibling)).toContain(
    "selected cleanup series",
  );
});

test("shows content immediately, reserves image space, and provides working section links", async () => {
  await renderCaseStudy();

  expect(container.querySelector("main").style.opacity).not.toBe("0");
  expect(
    container
      .querySelector(".case-study-home-link svg")
      .getAttribute("aria-hidden"),
  ).toBe("true");
  const images = [...container.querySelectorAll("article img")];
  expect(images.map((img) => [img.width, img.height])).toEqual([
    [2400, 1426],
    [432, 290],
  ]);
  for (const img of images) {
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
    expect(img.alt.length).toBeGreaterThan(0);
  }
  const sectionLinks = container.querySelectorAll(
    'nav[aria-label="In this case study"] a',
  );
  expect(sectionLinks.length).toBe(4);
  for (const link of sectionLinks) {
    expect(container.querySelector(link.getAttribute("href"))?.tagName).toBe(
      "H2",
    );
  }
});

test("links Zip's brand story and the request-page study, and keeps Home in flow", async () => {
  await renderCaseStudy();

  expect(
    container.querySelectorAll('a[href="https://zip.com/blog/zip-brand-story"]')
      .length,
  ).toBe(2);
  expect(
    container.querySelector('a[href="/projects-and-toys/rdp-case-study"]'),
  ).not.toBeNull();
  const navigation = container.querySelector(
    'nav[aria-label="More from Andrew"]',
  );
  expect([...navigation.querySelectorAll("a")].map(normalize)).toEqual([
    "About",
    "Back to Projects",
    "Email Andrew",
  ]);

  const inner = container.querySelector(".resume-inner-container");
  const home = container.querySelector("a.case-study-home-link");
  expect(home.parentElement).toBe(inner);
  expect(home.nextElementSibling).toBe(
    container.querySelector("article.resume-panel"),
  );
});
