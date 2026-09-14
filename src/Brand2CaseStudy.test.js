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

test("leads with the headline counts, ending on the flag count going to zero", async () => {
  await renderCaseStudy();

  expect(normalize(container.querySelector("h1"))).toBe(
    "Rebranding a live enterprise app, one flag at a time",
  );
  expect(
    [...container.querySelectorAll(".case-study-stats dd")].map(normalize),
  ).toEqual(["~20", "100+", "~12", "1,800 to 0"]);
});

test("tells the rollout as a timeline and the cleanup as a chart with an accessible table", async () => {
  await renderCaseStudy();

  const milestones = container.querySelectorAll(".case-study-timeline > li");
  expect(milestones.length).toBe(10);
  expect(normalize(milestones[0].querySelector("time"))).toBe("Jul 2024");
  expect(normalize(milestones[9].querySelector("time"))).toBe("Jan 10, 2025");

  const chart = container.querySelector(".rdp-chart");
  expect(chart.getAttribute("aria-hidden")).toBe("true");
  expect(chart.querySelectorAll(".rdp-bar").length).toBe(9);
  const figure = chart.closest("figure");
  expect(normalize(figure.querySelector("table caption"))).toBe(
    normalize(figure.querySelector("figcaption")),
  );
  expect(figure.querySelectorAll("tbody tr").length).toBe(9);
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
