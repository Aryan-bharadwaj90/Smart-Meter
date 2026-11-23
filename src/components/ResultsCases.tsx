"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { CASES, H, N, caseStats, inr, metrics, num, parseT } from "@/lib/data";
import { AnimatedNumber, Section } from "./ui";

export function Results() {
  const m = useMemo(() => metrics(), []);
  const items = [
    {
      label: "Electricity cost saved",
      value: m.saved,
      fmt: (v: number) => inr(v),
      sub: `${m.savedPct.toFixed(1)}% lower than a grid-only home: ${inr(m.costWo, 2)} down to ${inr(m.costW, 2)}`,
      color: "#E89F00",
    },
    {
      label: "Load met by solar and battery",
      value: m.selfShare,
      fmt: (v: number) => `${v.toFixed(1)}%`,
      sub: `${num(m.solar + m.batt, 0)} of ${num(m.load, 0)} kWh did not come straight from the grid`,
      color: "#16A672",
    },
    {
      label: "Battery charging from solar",
      value: m.chPvShare,
      fmt: (v: number) => `${v.toFixed(1)}%`,
      sub: `${num(m.chPv)} of ${num(m.chTotal)} kWh, the rest from the grid below ${60} Ah`,
      color: "#2F7BE0",
    },
    {
      label: "Hours with unserved load",
      value: m.unmetHours,
      fmt: (v: number) => `${Math.round(v)}`,
      sub: `${num(m.unmet)} kWh, when the grid was off and the battery ran down`,
      color: "#E04848",
    },
  ];
  return (
    <Section
      id="results"
      title="One month of results"
      lead={`Across ${m.days} days and ${m.hours} hourly readings, the controller cut the bill by more than a third without exporting a single unit to the grid.`}
    >
      <div className="grid overflow-hidden rounded-3xl border border-line bg-white sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, k) => (
          <div
            key={it.label}
            className={`relative p-6 sm:p-7 ${k > 0 ? "border-t border-line sm:border-t-0" : ""} ${k % 2 === 1 ? "sm:border-l" : ""} ${
              k >= 2 ? "sm:border-t lg:border-t-0" : ""
            } ${k > 0 ? "lg:border-l" : ""} border-line`}
          >
            <div className="mb-5 h-1 w-10 rounded-full" style={{ background: it.color }} />
            <div className="text-[0.95rem] text-ink2">{it.label}</div>
            <AnimatedNumber
              value={it.value}
              format={it.fmt}
              className="mt-2 block font-display text-[2.9rem] font-semibold leading-none tracking-[-0.03em] text-ink"
            />
            <p className="mt-3 text-[0.88rem] leading-relaxed text-muted">{it.sub}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Switch({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-xl bg-paper px-4 py-3">
      <span className="text-[0.95rem] font-medium text-ink">{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${on ? "bg-battery" : "bg-[#CAD2DD]"}`}>
        <motion.span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          initial={false}
          animate={{ left: on ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </span>
    </div>
  );
}

export function Cases({ jumpTo }: { jumpTo: (h: number) => void }) {
  const [sel, setSel] = useState(1);
  const reduce = useReducedMotion();
  const stats = useMemo(() => CASES.map((c) => caseStats(c.id)), []);
  const c = CASES[sel - 1];
  const s = stats[sel - 1];

  const example = () => {
    // A representative hour: the one in the middle of this case's hours, preferring daytime for solar cases
    const pool = s.idx.filter((i) => {
      const h = parseT(H.t[i]).hour;
      return c.sun ? h >= 10 && h <= 15 : h >= 19 || h <= 4;
    });
    const list = pool.length ? pool : s.idx;
    return list[Math.floor(list.length / 2)];
  };

  return (
    <Section
      id="cases"
      title="Four operating cases"
      lead="Every hour the controller reads two signals, whether the grid is available and whether the panels are producing, and applies one fixed rule. Solar always goes first, the grid second, and nothing is exported."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="flex flex-col gap-2" role="tablist" aria-label="Operating cases">
          {CASES.map((k, idx) => {
            const on = k.id === sel;
            return (
              <button
                key={k.id}
                role="tab"
                aria-selected={on}
                onClick={() => setSel(k.id)}
                className={`relative flex items-center gap-4 rounded-2xl px-5 py-4 text-left transition-colors ${on ? "" : "hover:bg-white/70"}`}
              >
                {on && (
                  <motion.span
                    layoutId="case-bg"
                    className="absolute inset-0 rounded-2xl border border-line bg-white shadow-[0_6px_20px_rgba(15,30,51,0.06)]"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  />
                )}
                <span
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-semibold text-white"
                  style={{ background: k.color }}
                >
                  {k.id}
                </span>
                <span className="relative flex-1">
                  <span className="block font-semibold text-ink">{k.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{k.supplier} supplies the load</span>
                </span>
                <span className="relative text-right">
                  <span className="tnum block font-semibold text-ink">{stats[idx].hours} h</span>
                  <span className="tnum block text-sm text-muted">{stats[idx].share.toFixed(1)}%</span>
                </span>
              </button>
            );
          })}
          <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white ring-1 ring-line" aria-hidden>
            {CASES.map((k, idx) => (
              <motion.div
                key={k.id}
                className="h-full border-r-2 border-white last:border-r-0"
                style={{ background: k.color }}
                initial={{ width: 0 }}
                whileInView={{ width: `${stats[idx].share}%` }}
                viewport={{ once: true }}
                transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}
          </div>
          <p className="px-1 text-sm text-muted">Share of the {N} hours spent in each case.</p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-line bg-white">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={sel}
              initial={{ opacity: 0, x: reduce ? 0 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduce ? 0 : -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="p-6 sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium" style={{ color: c.color }}>
                    Case {c.id}
                  </div>
                  <h3 className="mt-1 font-display text-[1.9rem] font-semibold leading-tight tracking-[-0.02em] text-ink">{c.title}</h3>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Switch label="Utility grid" on={c.grid} />
                <Switch label="Solar panels" on={c.sun} />
              </div>
              <p className="mt-5 max-w-[60ch] text-[1.02rem] leading-relaxed text-ink2">{c.rule}</p>

              <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 sm:grid-cols-4">
                <div>
                  <dt className="text-sm text-muted">Hours</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-ink">{s.hours}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Load</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-ink">{num(s.load)} kWh</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Bought from grid</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-ink">{num(s.imp)} kWh</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Cost vs grid only</dt>
                  <dd className="tnum mt-1 text-xl font-semibold text-ink">
                    {inr(s.costW)} <span className="text-base font-normal text-muted">/ {inr(s.costWo)}</span>
                  </dd>
                </div>
              </dl>
              {c.id === 4 && (
                <p className="mt-5 rounded-xl bg-paper px-4 py-3 text-sm leading-relaxed text-ink2">
                  This case costs slightly more than grid only because the grid also tops up the battery. That stored energy is spent later in cases 2 and 3, where the savings show up.
                </p>
              )}
              {c.id === 3 && s.unmet > 0 && (
                <p className="mt-5 rounded-xl bg-[#FDF0F0] px-4 py-3 text-sm leading-relaxed text-[#9B2C2C]">
                  {num(s.unmet)} kWh went unserved in this case because the 1.2 kWh battery reached its lower limit during long outages.
                </p>
              )}
              <button
                onClick={() => jumpTo(example())}
                className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-[#1c3150]"
              >
                Watch an hour of case {c.id} in the simulator
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}
