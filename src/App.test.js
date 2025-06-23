import React from "react";
import App from "./App";
import { test } from "bun:test";
import { createRoot } from "react-dom/client";

test("renders without crashing", () => {
  const div = document.createElement("div");
  const root = createRoot(div);
  root.render(<App />);
  root.unmount();
});
