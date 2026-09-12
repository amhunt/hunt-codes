import { describe, expect, test } from "bun:test";
import glslx from "glslx";

import { fragmentShader, vertexShader } from "./StarField";

const compile = (source) =>
  glslx.compile(source, {
    format: "json",
    renaming: "none",
  });

describe("StarField shaders", () => {
  test("vertex shader passes GLSL type checking", () => {
    // Three.js injects these declarations before compiling ShaderMaterial.
    const threePrelude = `
      attribute vec3 position;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
    `;
    const result = compile(threePrelude + vertexShader);

    expect(result.log).toBe("");
    expect(result.output).not.toBeNull();
  });

  test("fragment shader passes GLSL type checking", () => {
    const result = compile(fragmentShader);

    expect(result.log).toBe("");
    expect(result.output).not.toBeNull();
  });
});
