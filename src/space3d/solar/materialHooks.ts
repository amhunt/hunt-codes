import type * as THREE from "three";

/**
 * Shared plumbing for the shader patches this scene folds into three's
 * built-in materials (the wire skin in wireSkin.ts, the sweeping band in
 * shimmerBand.ts).
 *
 * A material has exactly one `onBeforeCompile`, so two patches that each
 * assigned it would silently clobber each other — and Earth and the
 * satellite need both (the energy wave has to keep sweeping while mesh
 * view is on). Patches register here instead: the installer keeps them in
 * a stable order, concatenates their GLSL, and builds one hook plus a
 * cache key that names every patch present. Three keys its program cache
 * on that key's text, so a material carrying one patch can never be
 * handed another's program.
 */

/** Where a patch's fragment body lands relative to the others. The wire
 *  skin replaces the lit color (it runs first); the shimmer band adds to
 *  whatever is there (so it rides on top of the wires, not under them). */
type HookOrder = "replace" | "add";

export interface MaterialHook {
  /** Names this patch in the program cache key; must describe every
   *  variation that changes the generated GLSL */
  key: string;
  order: HookOrder;
  uniforms: Record<string, THREE.IUniform>;
  vertexHeader?: string;
  /** Spliced after `#include <project_vertex>` */
  vertexBody?: string;
  fragmentHeader?: string;
  /** Spliced before `#include <opaque_fragment>`, where `outgoingLight`
   *  and `diffuseColor` are both in scope */
  fragmentBody?: string;
}

const ORDER: HookOrder[] = ["replace", "add"];

const registry = new WeakMap<THREE.Material, MaterialHook[]>();

/** Add a patch to a material (replacing any earlier one with the same
 *  key) and rebuild its compile hook. Call before the first render. */
export function registerMaterialHook(
  material: THREE.Material,
  hook: MaterialHook,
): void {
  const hooks = (registry.get(material) ?? []).filter(
    (h) => h.key !== hook.key,
  );
  hooks.push(hook);
  hooks.sort((a, b) => ORDER.indexOf(a.order) - ORDER.indexOf(b.order));
  registry.set(material, hooks);

  material.customProgramCacheKey = () => hooks.map((h) => h.key).join("|");
  material.onBeforeCompile = (shader) => {
    for (const h of hooks) {
      Object.assign(shader.uniforms, h.uniforms);
    }
    const join = (pick: (h: MaterialHook) => string | undefined) =>
      hooks.map(pick).filter(Boolean).join("");

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>${join((h) => h.vertexHeader)}`,
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>${join((h) => h.vertexBody)}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>${join((h) => h.fragmentHeader)}`,
      )
      .replace(
        "#include <opaque_fragment>",
        `${join((h) => h.fragmentBody)}#include <opaque_fragment>`,
      );
  };
  material.needsUpdate = true;
}
