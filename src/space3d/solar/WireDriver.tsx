import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import { setSceneWireMode, wireState, wireUniforms } from "./wireSkin";

/**
 * Drives the space/mesh crossfade for the whole scene: one uniform
 * write per frame moves every skinned body at once (they all share the
 * `uWire` uniform object), and the blend-state flip runs once per mode
 * change rather than per frame.
 *
 * The flip happens on the way *in* but not on the way out: going additive
 * immediately is invisible over the dark sky (additive and normal
 * blending agree where the backdrop is near-black), while restoring the
 * solid state early would pop a half-faded body back to opaque. So the
 * restore waits for the fade to finish.
 */
const WireDriver = ({ meshView }: { meshView: boolean }) => {
  const scene = useThree((state) => state.scene);
  /** Whether the bodies are currently carrying mesh view's blend state */
  const flipped = useRef(false);

  useEffect(() => {
    wireState.target = meshView ? 1 : 0;
    if (meshView && !flipped.current) {
      flipped.current = true;
      setSceneWireMode(scene, true);
    }
    // A scene that unmounted mid-fade (a route with no 3D, then back)
    // leaves `amount` stranded part-way; a fresh satellite-view mount
    // starts from a clean 0 rather than easing down from it.
    if (!meshView && !flipped.current) {
      wireState.amount = 0;
      wireUniforms.uWire.value = 0;
    }
  }, [meshView, scene]);

  useFrame((_, delta) => {
    if (wireState.amount !== wireState.target) {
      const ease = Math.min(1, delta * 3.5);
      const next =
        wireState.amount + (wireState.target - wireState.amount) * ease;
      wireState.amount =
        Math.abs(next - wireState.target) < 0.001 ? wireState.target : next;
      wireUniforms.uWire.value = wireState.amount;
    }
    // Gated on the state, not on the frame the fade happens to settle:
    // r3f's delta is uncapped, so one frame longer than ~1/3.5s (a
    // backgrounded tab, a texture decode) saturates the ease and lands
    // straight on the target. A restore hung off that transition would
    // never run, and every body would stay additive and depth-write-off
    // for the rest of the session.
    if (flipped.current && wireState.target === 0 && wireState.amount === 0) {
      flipped.current = false;
      setSceneWireMode(scene, false);
    }
  });

  return null;
};

export default WireDriver;
