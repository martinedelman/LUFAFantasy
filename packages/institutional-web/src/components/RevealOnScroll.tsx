"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  style?: CSSProperties;
}

export default function RevealOnScroll({ children, className = "", delayMs = 0, style }: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.14,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`card-reveal ${isVisible ? "is-visible" : ""} ${className}`}
      style={{ ...style, transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
