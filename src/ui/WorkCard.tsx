import React from "react";
import { ArrowUpRight } from "lucide-react";

/**
 * The inside of a work-sample card — /about's "Projects" grid and the
 * /projects-and-toys index share it (and the `.work-card*` styles in
 * App.scss). The wrapper decides what the card is: a router Link, an
 * external <a>, or a <button> (the Zip reel popover), so it carries the
 * `.work-card` class and this fills it.
 */
export const WorkCardBody = ({
  icon,
  title,
  subtitle,
  external = false,
  tag,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  /** Opens in a new tab — flag it with the arrow */
  external?: boolean;
  /** Corner label: "Silly" marks the toys on the résumé, so its tone is
   *  clear before a recruiter clicks into a synth; /projects-and-toys
   *  files every card by kind ("Toy", "Video", "Blog post"…) */
  tag?: string;
}) => (
  <>
    {tag && <span className="work-card-tag">{tag}</span>}
    <span className="work-card-icon" aria-hidden="true">
      {icon}
    </span>
    <span className="work-card-text">
      <span className="work-card-title">
        {title}
        {external && (
          <ArrowUpRight
            className="work-card-external"
            size={14}
            aria-hidden="true"
          />
        )}
      </span>
      <span className="work-card-subtitle">{subtitle}</span>
    </span>
  </>
);
