"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type RevealDirection = "up" | "left" | "right" | "none";

const DIRECTION_CLASS: Record<RevealDirection, string> = {
  up: "translate-y-6",
  left: "-translate-x-6",
  right: "translate-x-6",
  none: "",
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/** Subscribes to the OS-level reduced-motion preference via the browser API
 * itself (useSyncExternalStore) rather than mirroring it into state from an
 * effect — avoids the synchronous setState-in-effect anti-pattern entirely. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

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
  const [inView, setInView] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // Reduced-motion preference is reflected below via `visible`, no need to observe.
    if (reducedMotion) return;

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion, once]);

  const visible = reducedMotion || inView;

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
