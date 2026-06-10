import type { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "span";
  className?: string;
}

export default function Skeleton({ as: Component = "div", className = "", ...props }: SkeletonProps) {
  return <Component aria-hidden="true" className={`skeleton-shimmer ${className}`} {...props} />;
}
