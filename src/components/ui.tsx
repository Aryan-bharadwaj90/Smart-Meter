"use client";

import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { ReactNode, useEffect, useId, useRef, useState } from "react";

export function Section({
  id,
  title,
  lead,
  children,
  aside,
  dark = false,
}: {
  dark?: boolean;
  id: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[62ch]">
          <h2 className={`font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.6rem] ${dark ? "text-white" : "text-ink"}`}>
            {title}
          </h2>
          {lead && <p className="mt-4 text-[1.05rem] leading-relaxed text-ink2">{lead}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function PanelTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-[1.02rem] font-semibold text-ink">{children}</h3>
      {sub && <p className="mt-1 text-sm leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  dark = false,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  dark?: boolean;
  label: string;
}) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`no-scrollbar inline-flex max-w-full overflow-x-auto rounded-full p-1 ${
        dark ? "bg-white/8 ring-1 ring-white/10" : "bg-white ring-1 ring-line"
      }`}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active ? (dark ? "text-night" : "text-white") : dark ? "text-white/70 hover:text-white" : "text-ink2 hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className={`absolute inset-0 rounded-full ${dark ? "bg-white" : "bg-ink"}`}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Number that counts up when it scrolls into view and eases to new values. */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (v: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setShown(value);
      last.current = value;
      return;
    }
    const c = animate(last.current, value, {
      duration: last.current === 0 ? 1.4 : 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(v),
    });
    last.current = value;
    return () => c.stop();
  }, [inView, value, reduce]);

  return (
    <span ref={ref} className={`tnum ${className ?? ""}`}>
      {format(shown)}
    </span>
  );
}

/** Mounts children only once visible, so chart draw-in animations are seen. */
export function WhenVisible({ children, height }: { children: ReactNode; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <div ref={ref} style={{ minHeight: height }}>
      {inView ? children : null}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.85rem] text-ink">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-2">
          {it.dashed ? (
            <span className="inline-block h-0 w-4 border-t-2 border-dashed" style={{ borderColor: it.color }} />
          ) : (
            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: it.color }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

type TipRow = { name?: string | number; value?: unknown; color?: string; dataKey?: unknown; payload?: unknown };

export function ChartTip({
  active,
  payload,
  label,
  unit = "",
  labelFormat,
  valueFormat,
}: {
  active?: boolean;
  payload?: readonly TipRow[];
  label?: string | number;
  unit?: string;
  labelFormat?: (l: string | number) => string;
  valueFormat?: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="min-w-[160px] rounded-xl border border-line bg-white/95 px-3.5 py-2.5 text-[0.82rem] shadow-[0_8px_24px_rgba(15,30,51,0.12)] backdrop-blur">
      {label !== undefined && (
        <div className="mb-1.5 font-medium text-ink">{labelFormat ? labelFormat(label) : label}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <span className="inline-flex items-center gap-2 text-ink2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tnum font-medium text-ink">
            {typeof p.value === "number" ? (valueFormat ? valueFormat(p.value) : p.value.toFixed(2)) : String(p.value)}
            {unit && ` ${unit}`}
          </span>
        </div>
      ))}
    </div>
  );
}

export const axisProps = {
  stroke: "#C9D2DE",
  tick: { fill: "#7D8BA0", fontSize: 12 },
  tickLine: false,
} as const;
