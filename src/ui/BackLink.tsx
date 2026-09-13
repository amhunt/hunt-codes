import React from "react";
import { Link } from "react-router-dom";
import cx from "classnames";
import { ArrowLeftCircleIcon } from "lucide-react";

/** Shared icon and label; each page owns the link's positioning. */
export const BackLink = ({
  to = "/home",
  label = "Home",
  icon: Icon = ArrowLeftCircleIcon,
  className,
}: {
  to?: string;
  label?: string;
  icon?: React.ComponentType<{
    className?: string;
    size?: number;
    "aria-hidden"?: boolean | "true";
  }>;
  className?: string;
}) => (
  <Link className={cx("flex items-center gap-1", className)} to={to}>
    <Icon aria-hidden="true" className="starIcon" size={16} />
    <span>{label}</span>
  </Link>
);
