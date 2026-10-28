import { useLayoutEffect, useRef } from "react";

const DURATION = 260;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

// FLIP animation: when the list re-renders, every element that changed position slides
// from its old spot to the new one instead of jumping. Positions use offsetTop (relative
// to the list) so scrolling the page between renders doesn't trigger animations.
export function useFlip<T extends HTMLElement>(trigger: unknown) {
  const nodes = useRef(new Map<string, T>());
  const positions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const next = new Map<string, number>();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    nodes.current.forEach((el, key) => {
      const top = el.offsetTop;
      const previous = positions.current.get(key);
      if (!reduceMotion && previous !== undefined && Math.abs(previous - top) > 1) {
        el.animate([{ transform: `translateY(${previous - top}px)` }, { transform: "none" }], {
          duration: DURATION,
          easing: EASING,
        });
      }
      next.set(key, top);
    });

    positions.current = next;
  }, [trigger]);

  return (key: string) => (el: T | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };
}
