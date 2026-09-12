import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "lib/utils";

/**
 * Hover delays. One TooltipProvider at the root (App.tsx) carries the
 * default and a <Tooltip> overrides it — which is also what makes the
 * skip grace work: once one tooltip has opened, the next opens instantly
 * instead of waiting again, so a row of controls sweeps as one group.
 */
/** The site standard — Radix's own 700ms is sluggish, 0–100ms twitchy. */
const TOOLTIP_DELAY_MS = 500;
/** 3D body links: swept across rather than aimed at, and the tooltip is
 *  the only thing naming what a body does, so it answers fast. */
const TOOLTIP_BODY_DELAY_MS = 100;

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = ({
  className,
  sideOffset = 2,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-2 py-0 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
);

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TOOLTIP_DELAY_MS,
  TOOLTIP_BODY_DELAY_MS,
};
