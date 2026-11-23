"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { C, DAYS, H, N, hourLabel, metrics, num, parseT } from "@/lib/data";
import { ChartTip, Legend, Panel, PanelTitle, Section, Segmented, WhenVisible, axisProps } from "./ui";

// Sequential ramps (light to dark), one hue each
const BLUE = ["#EAF2FC", "#CDE2FB", "#9EC5F4", "#6DA7EC", "#3987E5", "#256ABF", "#184F95", "#0D366B"];
const AMBER = ["#FFF7E0", "#FDE7AD", "#F9D27A", "#F2B73A", "#E39A00", "#B87A00", "#8A5A00", "#5E3D00"];

function ramp(stops: string[], f: number) {
  const x = Math.min(0.9999, Math.max(0, f)) * (stops.length - 1);
  const k = Math.floor(x);
  const t = x - k;
  const a = stops[k];
  const b = stops[k + 1];
  const p = (s: string, o: number) => parseInt(s.slice(o, o + 2), 16);
  const mix = (o: number) => Math.round(p(a, o) + (p(b, o) - p(a, o)) * t);
  return `rgb(${mix(1)},${mix(3)},${mix(5)})`;
}

export default function LoadSolar() {
  const [view, setView] = useState<"load" | "pv">("load");
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const reduce = useReducedMotion();
  const m = useMemo(() => metrics(), []);

  const profile = useMemo(() => {
    const rows = Array.from({ length: 24 }, (_, h) => ({ hour: h, load: 0, pv: 0, n: 0 }));
    for (let i = 0; i < N; i++) {
      const r = rows[parseT(H.t[i]).hour];
      r.load += H.load[i];
      r.pv += H.pv[i];
      r.n++;
    }
    return rows.map((r) => ({ hour: r.hour, load: r.load / r.n, pv: r.pv / r.n }));
  }, []);

  const series = view === "load" ? H.load : H.pv;
  const max = Math.max(...series);
  const stops = view === "load" ? BLUE : AMBER;
  const cw = 34,
    ch = 16,
    gap = 2,
    left = 54,
    top = 6;
  const W = left + 24 * (cw + gap);
  const Hh = top + DAYS.length * (ch + gap) + 26;

  const hv = hover ? DAYS[hover.d].lo + hover.h : null;

  const stats = [
    { label: "Total load", value: `${num(m.load, 0)} kWh`, sub: `${num(m.load / m.days)} kWh per day` },
    { label: "Solar generated", value: `${num(m.pv, 0)} kWh`, sub: `${num(m.pv / m.days)} kWh per day` },
    { label: "Solar put to use", value: `${m.pvUsedPct.toFixed(1)}%`, sub: "Supplied the load or charged the battery" },
    { label: "Solar left unused", value: `${num(m.spill)} kWh`, sub: "Battery full and export not allowed" },
  ];

  return (
    <Section
      id="profile"
      title="Load and solar"
      lead="The house uses most power in the morning and evening, while the panels peak at noon. That mismatch is the whole reason the battery and the controller exist."
    >
      <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-5 sm:p-6">
            <dt className="text-sm text-ink2">{s.label}</dt>
            <dd className="tnum mt-1.5 font-display text-[1.8rem] font-semibold leading-none text-ink">{s.value}</dd>
            <dd className="mt-2 text-[0.82rem] text-muted">{s.sub}</dd>
          </div>
        ))}
      </dl>

      <Panel>
        <PanelTitle sub="Average over the month for each hour of the day.">An average day</PanelTitle>
        <Legend
          items={[
            { label: "Household load", color: C.ink },
            { label: "Solar generation", color: C.solar },
          ]}
        />
        <WhenVisible height={300}>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={profile} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSun" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.solar} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.solar} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#EDF1F6" />
                <XAxis dataKey="hour" {...axisProps} tickFormatter={(h: number) => hourLabel(h)} interval={2} />
                <YAxis {...axisProps} axisLine={false} unit=" kW" width={60} tickFormatter={(v: number) => v.toFixed(1)} />
                <Tooltip content={(p) => <ChartTip {...p} unit="kW" labelFormat={(l) => hourLabel(Number(l))} />} />
                <Area type="monotone" dataKey="pv" name="Solar generation" stroke={C.solar} strokeWidth={2.5} fill="url(#gSun)" animationDuration={1200} />
                <Line type="monotone" dataKey="load" name="Household load" stroke={C.ink} strokeWidth={2.5} dot={false} animationDuration={1200} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </WhenVisible>
      </Panel>

      <Panel className="mt-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <PanelTitle sub="Every hour of the month as one cell. Darker means more power. Hover a cell for its value.">Hour by hour, the whole month</PanelTitle>
          <Segmented
            label="Heatmap variable"
            value={view}
            onChange={setView}
            options={[
              { value: "load", label: "Household load" },
              { value: "pv", label: "Solar generation" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[0.8rem] text-muted">
          <span>0 kW</span>
          <span className="h-2.5 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${stops.join(",")})` }} />
          <span>{max.toFixed(1)} kW</span>
          <span className="ml-auto min-h-[1.25rem] text-ink">
            <AnimatePresence mode="wait">
              {hv !== null && (
                <motion.span key={hv} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  {DAYS[hover!.d].label}, {hourLabel(hover!.h)}: <strong className="tnum">{series[hv].toFixed(2)} kW</strong>
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${Hh}`} className="block h-auto w-full min-w-[640px]" onMouseLeave={() => setHover(null)} role="img" aria-label={`Heatmap of ${view === "load" ? "household load" : "solar generation"} by day and hour`}>
            {DAYS.map((d) => (
              <g key={d.date}>
                {d.i % 2 === 0 && (
                  <text x={left - 8} y={top + d.i * (ch + gap) + ch - 4} textAnchor="end" fontSize={10.5} fill={C.muted}>
                    {d.label}
                  </text>
                )}
                {Array.from({ length: 24 }, (_, h) => {
                  const v = series[d.lo + h] ?? 0;
                  const on = hover && hover.d === d.i && hover.h === h;
                  return (
                    <motion.rect
                      key={h}
                      x={left + h * (cw + gap)}
                      y={top + d.i * (ch + gap)}
                      width={cw}
                      height={ch}
                      rx={3}
                      initial={false}
                      animate={{ fill: ramp(stops, v / max) }}
                      transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : (h + d.i) * 0.006 }}
                      stroke={on ? C.ink : "none"}
                      strokeWidth={on ? 2 : 0}
                      onMouseEnter={() => setHover({ d: d.i, h })}
                    />
                  );
                })}
              </g>
            ))}
            {Array.from({ length: 12 }, (_, k) => k * 2).map((h) => (
              <text key={h} x={left + h * (cw + gap) + cw / 2} y={Hh - 8} textAnchor="middle" fontSize={11} fill={C.muted}>
                {hourLabel(h)}
              </text>
            ))}
          </svg>
        </div>
      </Panel>
    </Section>
  );
}
