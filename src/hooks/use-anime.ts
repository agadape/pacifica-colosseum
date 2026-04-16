"use client";

import { useEffect, useRef, useCallback } from "react";

let animeInstance: any = null;

async function getAnime() {
  if (typeof window === "undefined") return null;
  if (!animeInstance) {
    animeInstance = (await import("animejs")).default;
  }
  return animeInstance;
}

export function useAnime() {
  const timelineRef = useRef<any>(null);

  const runTimeline = useCallback(async (targets: HTMLElement | NodeListOf<HTMLElement>, props: Record<string, unknown>) => {
    const anime = await getAnime();
    if (!anime) return;
    const tl = anime.timeline(props);
    timelineRef.current = tl;
    return tl;
  }, []);

  const runAnimation = useCallback(async (targets: HTMLElement | NodeListOf<HTMLElement> | string, props: Record<string, unknown>) => {
    const anime = await getAnime();
    if (!anime) return;
    return anime({ targets, ...props });
  }, []);

  const staggerTargets = useCallback(async (
    targets: string,
    props: Record<string, unknown>
  ) => {
    const anime = await getAnime();
    if (!anime) return;
    return anime({ targets, ...props });
  }, []);

  return { runAnimation, runTimeline, staggerTargets, animeInstance };
}

export function useScrollReveal(options?: {
  threshold?: number;
  delay?: number;
  duration?: number;
  easing?: string;
}) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const anime = await getAnime();
            if (!anime) continue;
            anime({
              targets: entry.target,
              opacity: [0, 1],
              translateY: [30, 0],
              duration: options?.duration ?? 800,
              delay: options?.delay ?? 0,
              easing: options?.easing ?? "easeOutExpo",
            });
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: options?.threshold ?? 0.15 }
    );

    const el = containerRef.current;
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [options?.threshold, options?.delay, options?.duration, options?.easing]);

  return containerRef;
}

export function useCounterAnimation(
  targetValue: number,
  options?: {
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
  }
) {
  const elementRef = useRef<HTMLElement | null>(null);
  const animationRef = useRef<any>(null);

  const start = useCallback(async () => {
    const anime = await getAnime();
    if (!anime || !elementRef.current) return;

    if (animationRef.current) {
      animationRef.current.pause();
    }

    const obj = { value: 0 };
    animationRef.current = anime({
      targets: obj,
      value: targetValue,
      duration: options?.duration ?? 1200,
      easing: "easeOutExpo",
      update: () => {
        if (!elementRef.current) return;
        const decimals = options?.decimals ?? 0;
        const display = obj.value.toFixed(decimals);
        elementRef.current.textContent =
          (options?.prefix ?? "") + display + (options?.suffix ?? "");
      },
    });
  }, [targetValue, options?.duration, options?.prefix, options?.suffix, options?.decimals]);

  return { elementRef, start };
}
