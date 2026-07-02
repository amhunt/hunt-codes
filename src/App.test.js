import React, { act } from "react";
import App from "./App";
import { expect, test } from "bun:test";
import { createRoot } from "react-dom/client";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test("renders without crashing", async () => {
  const div = document.createElement("div");
  const root = createRoot(div);
  // createRoot renders asynchronously; flush via act so a crashing <App /> fails the test
  await act(async () => root.render(<App />));
  expect(div.innerHTML).not.toBe("");
  await act(async () => root.unmount());
});
