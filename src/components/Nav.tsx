"use client";

import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useEffect, useState } from "react";

export const SECTIONS = [
  { id: "simulator", label: "Simulator" },
  { id: "results", label: "Results" },
  { id: "cases", label: "Cases" },
  { id: "cost", label: "Cost and energy" },
  { id: "battery", label: "Battery" },
  { id: "profile", label: "Load and solar" },
  { id: "forecast", label: "Forecasting" },
  { id: "conclusion", label: "Conclusion" },
];

export default function Nav() {
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  const [light, setLight] = useState(false);
  const [active, setActive] = useState("simulator");

  useMotionValueEvent(scrollY, "change", (y) => {
    const hero = document.getElementById("hero");
    setLight(hero ? y > hero.offsetHeight - 70 : y > 600);
  });

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.2, 0.5] }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        light ? "border-b border-line bg-white/85 backdrop-blur-md" : "bg-night/40 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-8">
        <a href="#hero" className={`flex shrink-0 items-center gap-2.5 font-display text-[1.05rem] font-semibold ${light ? "text-ink" : "text-white"}`}>
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
            <circle cx="11" cy="11" r="10" fill="none" stroke="#E89F00" strokeWidth="2" />
            <path d="M12.5 4 L7 12 H11 L9.5 18 L15 10 H11 Z" fill="#E89F00" />
          </svg>
          <span className="hidden sm:inline">Smart Energy</span>
        </a>
        <nav aria-label="Sections" className="no-scrollbar -mx-2 flex flex-1 gap-1 overflow-x-auto">
          {SECTIONS.map((s) => {
            const on = active === s.id;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`relative shrink-0 rounded-full px-3 py-1.5 text-[0.88rem] font-medium transition-colors ${
                  light ? (on ? "text-white" : "text-ink2 hover:text-ink") : on ? "text-night" : "text-white/70 hover:text-white"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="nav-pill"
                    className={`absolute inset-0 rounded-full ${light ? "bg-ink" : "bg-white"}`}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{s.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
      <motion.div style={{ scaleX: progress }} className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-solar" />
    </header>
  );
}
