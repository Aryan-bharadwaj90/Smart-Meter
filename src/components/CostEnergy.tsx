"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Brush, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { C, DAYS, inr, metrics, num } from "@/lib/data";
import { AnimatedNumber, ChartTip, Legend, Panel, PanelTitle, Section, Segmented, WhenVisible, axisProps } from "./ui";

type Preset = "all" | "w1" | "w2" | "w3" | "w4";
const PRESETS: Record<Preset, [number, number]> = {
  all: [0, DAYS.length - 1],
  w1: [0, 6],
  w2: [7, 13],
  w3: [14, 20],
  w4: [21, DAYS.length - 1],
};

export default function CostEnergy() {
  const [preset, setPreset] = useState<Preset | "custom">("all");
  const [range, setRange] = useState<[number, number]>(PRESETS.all);
  const reduce = useReducedMotion();

  const m = useMemo(() => metrics(DAYS[range[0]].lo, DAYS[range[1]].hi), [range]);

  const cumulative = useMemo(() => {
    let acc = 0;
    return DAYS.slice(range[0], range[1] + 1).map((d) => {
      acc += d.costWo - d.costW;
      return { label: d.label, saved: acc, without: d.costWo, with: d.costW };
    });
  }, [range]);

  const pick = (p: Preset) => {
    setPreset(p);
    setRange(PRESETS[p]);
  };

  const sources = [
    { name: "Solar", v: m.solar, color: C.solar, text: "#2B1D00" },
    { name: "Battery", v: m.batt, color: C.battery, text: "#fff" },
    { name: "Grid", v: m.grid, color: C.grid, text: "#fff" },
    { name: "Unserved", v: m.unmet, color: C.alert, text: "#fff" },
  ];

  return (
    <Section
      id="cost"
      title="Cost and energy"
      lead="Choose a week, or drag the handles under the daily chart, and every number in this section recalculates for that period."
      aside={
        <Segmented
          label="Analysis period"
          value={preset === "custom" ? ("" as Preset) : preset}
          onChange={pick}
          options={[
            { value: "all", label: "Whole month" },
            { value: "w1", label: "Week 1" },
            { value: "w2", label: "Week 2" },
            { value: "w3", label: "Week 3" },
            { value: "w4", label: "Week 4" },
          ]}
        />
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelTitle sub={`${DAYS[range[0]].label} to ${DAYS[range[1]].label}, ${m.days} days`}>Electricity bill</PanelTitle>
          <div className="space-y-5">
            {[
              { name: "Grid only", v: m.costWo, color: C.without },
              { name: "With solar and battery", v: m.costW, color: C.ink },
            ].map((b) => (
              <div key={b.name}>
                <div className="mb-1.5 flex items-baseline justify-between text-[0.95rem]">
                  <span className="text-ink2">{b.name}</span>
                  <AnimatedNumber value={b.v} format={(v) => inr(v, 2)} className="font-semibold text-ink" />
                </div>
                <div className="h-9 overflow-hidden rounded-lg bg-paper">
                  <motion.div
                    className="h-full rounded-lg"
                    style={{ background: b.color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(100 * b.v) / m.costWo}%` }}
                    animate={{ width: `${(100 * b.v) / m.costWo}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: reduce ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-line pt-5">
            <div>
              <div className="text-sm text-muted">Saved in this period</div>
              <AnimatedNumber value={m.saved} format={(v) => inr(v, 2)} className="mt-1 block font-display text-[2.2rem] font-semibold leading-none text-ink" />
            </div>
            <div className="text-right">
              <div className="text-sm text-muted">Reduction</div>
              <AnimatedNumber value={m.savedPct} format={(v) => `${v.toFixed(1)}%`} className="mt-1 block font-display text-[2.2rem] font-semibold leading-none text-battery" />
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelTitle sub="Where every kWh of household demand came from. Battery energy was stored earlier from solar or the grid.">
            Source of the load
          </PanelTitle>
          <div className="flex h-14 overflow-hidden rounded-xl">
            {sources.map((s) => {
              const share = (100 * s.v) / m.load;
              return (
                <motion.div
                  key={s.name}
                  className="flex items-center justify-center border-r-2 border-white text-sm font-semibold last:border-r-0"
                  style={{ background: s.color, color: s.text }}
                  initial={false}
                  animate={{ width: `${share}%` }}
                  transition={{ duration: reduce ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                  {share >= 7 ? `${share.toFixed(0)}%` : ""}
                </motion.div>
              );
            })}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
            {sources.map((s) => (
              <div key={s.name} className="flex items-start gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
                <div>
                  <dt className="text-sm text-ink2">{s.name}</dt>
                  <dd className="tnum font-semibold text-ink">
                    {num(s.v)} kWh <span className="font-normal text-muted">({((100 * s.v) / m.load).toFixed(1)}%)</span>
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel className="mt-5">
        <PanelTitle sub="Drag the handles under the chart to analyse any run of days.">Daily load by source</PanelTitle>
        <Legend
          items={[
            { label: "Solar", color: C.solar },
            { label: "Battery", color: C.battery },
            { label: "Grid", color: C.grid },
            { label: "Unserved", color: C.alert },
          ]}
        />
        <WhenVisible height={360}>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAYS} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid vertical={false} stroke="#EDF1F6" />
                <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
                <YAxis {...axisProps} axisLine={false} unit=" kWh" width={64} />
                <Tooltip cursor={{ fill: "rgba(15,30,51,0.04)" }} content={(p) => <ChartTip {...p} unit="kWh" valueFormat={(v) => v.toFixed(1)} />} />
                <Bar dataKey="solar" name="Solar" stackId="a" fill={C.solar} stroke="#fff" strokeWidth={1} animationDuration={900} />
                <Bar dataKey="battery" name="Battery" stackId="a" fill={C.battery} stroke="#fff" strokeWidth={1} animationDuration={900} />
                <Bar dataKey="grid" name="Grid" stackId="a" fill={C.grid} stroke="#fff" strokeWidth={1} animationDuration={900} />
                <Bar dataKey="unserved" name="Unserved" stackId="a" fill={C.alert} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} animationDuration={900} />
                <Brush
                  key={preset === "custom" ? "custom" : preset}
                  dataKey="label"
                  height={28}
                  stroke="#9AA8BB"
                  fill="#F7F9FB"
                  travellerWidth={10}
                  startIndex={range[0]}
                  endIndex={range[1]}
                  onChange={(r) => {
                    if (r.startIndex === undefined || r.endIndex === undefined) return;
                    setPreset("custom");
                    setRange([r.startIndex, r.endIndex]);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WhenVisible>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelTitle>Daily cost</PanelTitle>
          <Legend
            items={[
              { label: "Grid only", color: C.muted },
              { label: "With solar and battery", color: C.ink },
            ]}
          />
          <WhenVisible height={280}>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulative} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gWith" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.ink} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={C.ink} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#EDF1F6" />
                  <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                  <YAxis {...axisProps} axisLine={false} tickFormatter={(v) => `₹${v}`} width={56} />
                  <Tooltip content={(p) => <ChartTip {...p} valueFormat={(v) => inr(v)} />} />
                  <Area type="monotone" dataKey="without" name="Grid only" stroke={C.muted} strokeWidth={2} fill="none" />
                  <Area type="monotone" dataKey="with" name="With solar and battery" stroke={C.ink} strokeWidth={2.5} fill="url(#gWith)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </WhenVisible>
        </Panel>
        <Panel>
          <PanelTitle>Savings adding up</PanelTitle>
          <Legend items={[{ label: "Total saved since the start of the period", color: C.battery }]} />
          <WhenVisible height={280}>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulative} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSave" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.battery} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={C.battery} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#EDF1F6" />
                  <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                  <YAxis {...axisProps} axisLine={false} tickFormatter={(v) => `₹${v}`} width={56} />
                  <Tooltip content={(p) => <ChartTip {...p} valueFormat={(v) => inr(v)} />} />
                  <Area type="monotone" dataKey="saved" name="Saved so far" stroke={C.battery} strokeWidth={2.5} fill="url(#gSave)" animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </WhenVisible>
        </Panel>
      </div>
      <p className="mt-5 max-w-[95ch] text-sm leading-relaxed text-muted">
        Cost with the system counts every unit bought from the grid, including grid charging of the battery. Load that could not be served is not billed. Cost without the system is the full load at ₹7 per kWh.
      </p>
    </Section>
  );
}
