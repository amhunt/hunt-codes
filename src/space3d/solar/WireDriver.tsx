import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import {
  setSceneWireMode,
  setWireTarget,
  stepWireFade,
  wireState,
} from "./wireSkin";

/**
 * Drives the space/mesh crossfade for one canvas: advances the shared
 * fade each frame and flips this scene's skinned materials' blend state
 * once per mode change rather than per frame. Two of these run at once —
 * one in the solar scene, one in the star canvas for the corner coin —
 * and they agree because the fade runs off the clock (see stepWireFade),
 * not off each driver's own frame delta.
 *
 * The flip happens on the way *in* but not on the way out: going additive
 * immediately is invisible over the dark sky (additive and normal
 * blending agree where the backdrop is near-black), while restoring the
 * solid state early would pop a half-faded body back to opaque. So the
 * restore waits for the fade to finish.
 */
const WireDriver = ({ meshView }: { meshView: boolean }) => {
  const scene = useThree((state) => state.scene);
  /** Whether this scene's bodies are currently carrying mesh view's
   *  blend state */
  const flipped = useRef(false);

  useEffect(() => {
    setWireTarget(meshView ? 1 : 0);
    if (meshView && !flipped.current) {
      flipped.current = true;
      setSceneWireMode(scene, true);
    }
  }, [meshView, scene]);

  useFrame(() => {
    stepWireFade(performance.now());
    // Gated on the state rather than on a transition edge, so a scene
    // that was flipped is restored whenever the fade sits at 0 — even if
    // the frame that landed it there was skipped (a backgrounded tab)
    if (flipped.current && wireState.target === 0 && wireState.amount === 0) {
      flipped.current = false;
      setSceneWireMode(scene, false);
    }
  });

  return null;
};

export default WireDriver;
