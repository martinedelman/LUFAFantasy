"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Skeleton from "@/components/Skeleton";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "circle" | "rounded";

interface AvatarProps {
  imageUrl?: string;
  alt?: string;
  fallback?: ReactNode;
  backgroundColor?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  className?: string;
  fallbackClassName?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-20 h-20",
};

const shapeClasses: Record<AvatarShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-lg",
};

function mergeClasses(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export default function Avatar({
  imageUrl,
  alt,
  fallback,
  backgroundColor = "#6B7280",
  size = "md",
  shape = "circle",
  className,
  fallbackClassName,
}: AvatarProps) {
  const baseClasses = mergeClasses(
    "inline-flex shrink-0 items-center justify-center overflow-hidden",
    sizeClasses[size],
    shapeClasses[shape],
    className,
  );
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">(imageUrl ? "loading" : "error");

  useEffect(() => {
    if (!imageUrl) {
      setImageState("error");
      return;
    }

    let isActive = true;
    const image = new Image();
    setImageState("loading");
    image.onload = () => {
      if (isActive) setImageState("loaded");
    };
    image.onerror = () => {
      if (isActive) setImageState("error");
    };
    image.src = imageUrl;

    if (image.complete) {
      setImageState(image.naturalWidth > 0 ? "loaded" : "error");
    }

    return () => {
      isActive = false;
    };
  }, [imageUrl]);

  if (imageUrl) {
    if (imageState === "loading") {
      return (
        <div className={mergeClasses(baseClasses, "relative bg-slate-100")} aria-label={alt || "Cargando avatar"}>
          <Skeleton className="absolute inset-0" />
        </div>
      );
    }

    if (imageState === "error") {
      return (
        <div className={baseClasses} style={{ backgroundColor }} aria-label={alt || "Avatar fallback"}>
          <span className={mergeClasses("font-bold text-white", fallbackClassName)}>{fallback}</span>
        </div>
      );
    }

    return (
      <div
        className={mergeClasses(baseClasses, " border-none  bg-cover bg-center")}
        style={{ backgroundImage: `url(${imageUrl})` }}
        role="img"
        aria-label={alt || "Avatar"}
      />
    );
  }

  return (
    <div className={baseClasses} style={{ backgroundColor }} aria-label={alt || "Avatar fallback"}>
      <span className={mergeClasses("font-bold text-white", fallbackClassName)}>{fallback}</span>
    </div>
  );
}
