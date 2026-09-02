import React from "react";
import * as Switch from "@radix-ui/react-switch";
import cx from "classnames";

/**
 * The site's toggle chassis: a 68×34 pill whose round thumb slides across
 * with a little overshoot. App.scss `.scene-switch` carries the geometry,
 * the shell shading and the slide; the track and thumb are otherwise
 * undressed so each switch can paint its own scene on the track (sky and
 * clouds, a bouncing equaliser) via `children` and its own thumb art (sun
 * and moon, a speaker) via `thumb`. Radix mirrors `data-state="checked"`
 * onto both the root and the thumb, which is what the per-switch styles
 * key off.
 */
const SceneSwitch = ({
  className,
  thumbClassName,
  thumb,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Switch.Root> & {
  /** What rides on the thumb */
  thumb?: React.ReactNode;
  thumbClassName?: string;
}) => (
  <Switch.Root className={cx("scene-switch", className)} {...props}>
    {children}
    <Switch.Thumb className={cx("scene-switch-thumb", thumbClassName)}>
      {thumb}
    </Switch.Thumb>
  </Switch.Root>
);

export default SceneSwitch;
