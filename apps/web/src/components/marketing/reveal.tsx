"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealDirection = "up" | "left" | "right" | "none";

const DIRECTION_CLASS: Record<RevealDirection, string> = {
  up: "translate-y-6",
  left: "-translate-x-6",
  right: "translate-x-6",
  none: "",
};

/**
 * Scroll-triggered fade/slide-in — the site's other entrance animations
 * (tw-animate-css's `animate-in`) only fire once on mount, so anything below
 * the fold has already finished animating by the time a visitor scrolls to
 * it and just looks static. This uses IntersectionObserver to hold elements
 * in their pre-entrance state until they're actually about to enter the
 * viewport, then transitions them in — the difference between an animation
 * that plays once at page-load and one that plays as you scroll.
 */
export function Reveal({
  children,
  className,
  direction = "up",
  delay = 0,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: RevealDirection;
  /** ms */
  delay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect reduced-motion preference — show content immediately, no observer needed.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all ease-out",
        visible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${DIRECTION_CLASS[direction]}`,
        className,
      )}
      style={{ transitionDuration: "700ms", transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
