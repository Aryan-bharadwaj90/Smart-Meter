"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BAT_MAX, BAT_MIN, BAT_TOPUP, C, DAYS, H, TARIFF, dayLabel, hourLabel, inr, metrics, num, parseT } from "@/lib/data";
import { ChartTip, Legend, Panel, PanelTitle, Section, Segmented, WhenVisible, axisProps } from "./ui";

type Wk = "1" | "2" | "3" | "4" | "5";

export default function Battery() {
  const [wk, setWk] = useState<Wk>("1");
  const reduce = useReducedMotion();
  const m = useMemo(() => metrics(), []);

  const soc = useMemo(() => {
    const d0 = (Number(wk) - 1) * 7;
    const d1 = Math.min(DAYS.length - 1, d0 + 6);
    const out = [];
    for (let i = DAYS[d0].lo; i <= DAYS[d1].hi; i++) {
      out.push({ i, t: H.t[i], ah: H.ah[i], case: H.case[i] });
    }
    return out;
  }, [wk]);

  const byHour = useMemo(() => {
    const rows = Array.from({ length: 24 }, (_, h) => ({ hour: h, solar: 0, grid: 0 }));
    H.t.forEach((t, i) => {
      const h = parseT(t).hour;
      rows[h].solar += H.chPv[i];
      rows[h].grid += H.chGrid[i];
    });
    return rows;
  }, []);

  const stats = [
    { label: "Charged from solar", value: `${num(m.chPv)} kWh`, sub: "Free energy stored for later" },
    { label: "Charged from the grid", value: `${num(m.chGrid)} kWh`, sub: `Cost ${inr(m.chGrid * TARIFF)} at ₹${TARIFF} per kWh` },
    { label: "Delivered to the load", value: `${num(m.batt)} kWh`, sub: "Mostly during outages" },
    { label: "Hours at lower limit", value: `${m.minHours}`, sub: `Battery held at ${BAT_MIN} Ah` },
  ];

  return (
    <Section
      id="battery"
      title="Battery behaviour"
      lead={`A 100 Ah, 12 V battery stores 1.2 kWh. It is kept between ${BAT_MIN} and ${BAT_MAX} Ah, charged by solar first, and topped up by the grid only when it falls below ${BAT_TOPUP} Ah.`}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <PanelTitle sub="Hourly state of charge. The shaded band is the protected range below the lower limit.">Charge level over a week</PanelTitle>
            <Segmented
              label="Week"
              value={wk}
              onChange={setWk}
              options={["1", "2", "3", "4", "5"].map((w) => ({ value: w as Wk, label: `Week ${w}` }))}
            />
          </div>
          <WhenVisible height={320}>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={soc} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSoc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.battery} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={C.battery} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#EDF1F6" />
                  <ReferenceArea y1={0} y2={BAT_MIN} fill={C.alert} fillOpacity={0.06} />
                  <XAxis
                    dataKey="t"
                    {...axisProps}
                    tickFormatter={(t: string) => dayLabel(t)}
                    interval={23}
                  />
                  <YAxis {...axisProps} axisLine={false} domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} unit=" Ah" width={60} />
                  <ReferenceLine
                    y={BAT_TOPUP}
                    stroke="#9AA8BB"
                    strokeDasharray="4 4"
                    label={{ value: `Grid top up below ${BAT_TOPUP} Ah`, position: "insideBottomLeft", fill: C.ink2, fontSize: 12 }}
                  />
                  <ReferenceLine
                    y={BAT_MIN}
                    stroke={C.alert}
                    strokeDasharray="4 4"
                    label={{ value: "Lower limit", position: "insideBottomLeft", fill: C.ink2, fontSize: 12 }}
                  />
                  <Tooltip
                    content={(p) => (
                      <ChartTip
                        {...p}
                        unit="Ah"
                        valueFormat={(v) => v.toFixed(0)}
                        labelFormat={(l) => `${dayLabel(String(l))}, ${hourLabel(parseT(String(l)).hour)}`}
                      />
                    )}
                  />
                  <Area type="stepAfter" dataKey="ah" name="Charge" stroke={C.battery} strokeWidth={2} fill="url(#gSoc)" animationDuration={900} key={wk} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </WhenVisible>
        </Panel>

        <Panel className="flex flex-col">
          <PanelTitle sub="Share of all energy that went into the battery.">Who charged the battery</PanelTitle>
          <div className="flex h-12 overflow-hidden rounded-xl">
            {[
              { v: m.chPvShare, color: C.solar, text: "#2B1D00", name: "Solar" },
              { v: 100 - m.chPvShare, color: C.grid, text: "#fff", name: "Grid" },
            ].map((s, k) => (
              <motion.div
                key={s.name}
                className="flex items-center justify-center border-r-2 border-white text-sm font-semibold last:border-r-0"
                style={{ background: s.color, color: s.text }}
                initial={{ width: k === 0 ? "0%" : "100%" }}
                whileInView={{ width: `${s.v}%` }}
                viewport={{ once: true }}
                transition={{ duration: reduce ? 0 : 1, ease: [0.16, 1, 0.3, 1] }}
              >
                {s.name} {s.v.toFixed(0)}%
              </motion.div>
            ))}
          </div>
          <dl className="mt-7 grid grid-cols-2 content-start gap-x-5 gap-y-6">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-sm text-muted">{s.label}</dt>
                <dd className="tnum mt-1 text-xl font-semibold text-ink">{s.value}</dd>
                <dd className="mt-0.5 text-[0.82rem] leading-snug text-muted">{s.sub}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel className="mt-5">
        <PanelTitle sub="Solar charging happens in daylight. Grid charging fills the gaps in the evening and night, when the battery drops below 60 Ah.">
          Charging by hour of day, whole month
        </PanelTitle>
        <Legend
          items={[
            { label: "From solar", color: C.solar },
            { label: "From grid", color: C.grid },
          ]}
        />
        <WhenVisible height={260}>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="16%">
                <CartesianGrid vertical={false} stroke="#EDF1F6" />
                <XAxis dataKey="hour" {...axisProps} tickFormatter={(h: number) => hourLabel(h)} interval={2} />
                <YAxis {...axisProps} axisLine={false} unit=" kWh" width={60} domain={[0, (mx: number) => Math.ceil(mx)]} />
                <Tooltip
                  cursor={{ fill: "rgba(15,30,51,0.04)" }}
                  content={(p) => <ChartTip {...p} unit="kWh" labelFormat={(l) => hourLabel(Number(l))} />}
                />
                <Bar dataKey="solar" name="From solar" stackId="c" fill={C.solar} stroke="#fff" strokeWidth={1} />
                <Bar dataKey="grid" name="From grid" stackId="c" fill={C.grid} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WhenVisible>
      </Panel>
    </Section>
  );
}
