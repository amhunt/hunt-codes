import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "lib/utils";

/**
 * Hover delays, in Radix's `delayDuration` terms. The site mounts a
 * single TooltipProvider at the root (App.tsx), so the provider carries
 * the default and an individual <Tooltip> overrides it where it needs to.
 *
 * One provider rather than one per tooltip is what makes the skip grace
 * work: once any tooltip has opened, the next one the pointer reaches
 * opens instantly instead of serving its delay again. That's what lets a
 * sweep along the view switch, or across the satellite's parts, read as
 * one group of controls rather than a series of separate waits.
 */
/** The site standard — Radix's own 700ms feels sluggish, 0–100ms twitchy. */
const TOOLTIP_DELAY_MS = 500;
/**
 * The 3D body links (Earth, the asteroids, the satellite's parts, the
 * 808 pad). These get swept across rather than aimed at, and the tooltip
 * is the only thing that names what a body does — so they answer fast.
 */
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
