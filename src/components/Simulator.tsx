"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BAT_MAX, BAT_MIN, BAT_TOPUP, C, CASES, DAYS, H, N, caseColor, fullLabel, hourLabel, inr, parseT } from "@/lib/data";
import { Segmented } from "./ui";

const fmt = (x: number) => x.toFixed(2);

type Layout = {
  w: number;
  h: number;
  nw: number;
  n: Record<"solar" | "grid" | "batt" | "home", [number, number]>;
  c: [number, number];
  e: Record<"solar" | "grid" | "batt" | "home", string>;
  l: Record<"solar" | "grid" | "batt" | "home", [number, number]>;
};

const WIDE: Layout = {
  w: 1000,
  h: 500,
  nw: 250,
  n: { solar: [40, 46], grid: [40, 326], batt: [710, 46], home: [710, 326] },
  c: [392, 170],
  e: {
    solar: "M290 110 C 350 110, 340 215, 392 215",
    grid: "M290 390 C 350 390, 340 285, 392 285",
    batt: "M608 215 C 660 215, 650 110, 710 110",
    home: "M608 285 C 660 285, 650 390, 710 390",
  },
  l: { solar: [340, 150], grid: [340, 350], batt: [660, 150], home: [660, 350] },
};

const COMPACT: Layout = {
  w: 500,
  h: 700,
  nw: 236,
  n: { solar: [10, 20], grid: [254, 20], batt: [10, 552], home: [254, 552] },
  c: [142, 270],
  e: {
    solar: "M128 148 C 128 215, 200 205, 200 270",
    grid: "M372 148 C 372 215, 300 205, 300 270",
    batt: "M200 430 C 200 495, 128 485, 128 552",
    home: "M300 430 C 300 495, 372 485, 372 552",
  },
  l: { solar: [92, 212], grid: [408, 212], batt: [92, 490], home: [408, 490] },
};

function useCompact() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setCompact(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return compact;
}

function Edge({
  d,
  kw,
  color,
  reverse = false,
  label,
  lx,
  ly,
}: {
  d: string;
  kw: number;
  color: string;
  reverse?: boolean;
  label: string;
  lx: number;
  ly: number;
}) {
  const on = kw > 0.005;
  const width = 3 + Math.min(kw, 3) * 2.2;
  const dur = Math.min(2.6, Math.max(0.35, 1.8 / (kw + 0.2)));
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={10} strokeLinecap="round" />
      {on && (
        <>
          <path d={d} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={width} strokeLinecap="round" />
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={width + 1}
            className={`flow ${reverse ? "rev" : ""}`}
            style={{ ["--dur" as string]: `${dur}s` }}
          />
        </>
      )}
      <g transform={`translate(${lx} ${ly})`}>
        <rect
          x={-46}
          y={-14}
          width={92}
          height={28}
          rx={14}
          fill="#0b1729"
          stroke={on ? color : "rgba(255,255,255,0.12)"}
          strokeOpacity={on ? 0.8 : 1}
        />
        <text
          textAnchor="middle"
          y={5}
          fontSize={13.5}
          fontFamily="var(--font-mono)"
          fill={on ? "#fff" : "rgba(255,255,255,0.4)"}
        >
          {label}
        </text>
      </g>
    </g>
  );
}

function Node({
  x,
  y,
  w = 250,
  h = 128,
  color,
  title,
  status,
  value,
  unit,
  sub,
  subColor,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  color: string;
  title: string;
  status?: boolean;
  value: string;
  unit: string;
  sub: string;
  subColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={16} fill="#0f1d31" stroke="rgba(255,255,255,0.1)" />
      <rect x={0} y={18} width={4} height={h - 36} rx={2} fill={color} />
      <text x={22} y={32} fontSize={15} fontWeight={600} fill="#fff">
        {title}
      </text>
      {status !== undefined && (
        <g transform={`translate(${w - 62} 16)`}>
          <rect width={46} height={22} rx={11} fill={status ? "rgba(22,166,114,0.18)" : "rgba(255,255,255,0.08)"} />
          <text x={23} y={15} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={status ? "#5BE0AC" : "rgba(255,255,255,0.5)"}>
            {status ? "ON" : "OFF"}
          </text>
        </g>
      )}
      <text x={22} y={76} fill="#fff" fontFamily="var(--font-mono)">
        <tspan fontSize={30} fontWeight={500}>
          {value}
        </tspan>
        <tspan fontSize={15} fill="rgba(255,255,255,0.55)" dx={6}>
          {unit}
        </tspan>
      </text>
      <text x={22} y={104} fontSize={13} fill={subColor ?? "rgba(255,255,255,0.6)"}>
        {sub}
      </text>
      {children}
    </g>
  );
}

function pickScenes() {
  const find = (fn: (i: number) => boolean, from = 0) => {
    for (let i = from; i < N; i++) if (fn(i)) return i;
    return 0;
  };
  return [
    { label: "Sunny noon", hint: "Solar runs the house and charges the battery", i: find((i) => H.case[i] === 1 && H.chPv[i] > 0.2 && parseT(H.t[i]).hour >= 11) },
    { label: "Evening peak", hint: "Grid supplies the load and tops up the battery", i: find((i) => H.case[i] === 4 && H.chGrid[i] > 0 && parseT(H.t[i]).hour >= 18) },
    { label: "Outage in daylight", hint: "Grid is off, solar and battery cover the load", i: find((i) => H.case[i] === 2 && H.dis[i] > 0) },
    { label: "Outage at night", hint: "Battery alone, until it reaches its limit", i: find((i) => H.case[i] === 3 && H.unmet[i] > 0) },
  ];
}

export default function Simulator({ hour, setHour }: { hour: number; setHour: (h: number) => void }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<"1" | "4" | "12">("4");
  const reduce = useReducedMotion();
  const scenes = useMemo(pickScenes, []);
  const L = useCompact() ? COMPACT : WIDE;

  const hourRef = useRef(hour);
  hourRef.current = hour;

  useEffect(() => {
    if (!playing) return;
    const ms = 1100 / Number(speed);
    const id = setInterval(() => setHour((hourRef.current + 1) % N), ms);
    return () => clearInterval(id);
  }, [playing, speed, setHour]);

  const i = hour;
  const cs = CASES[H.case[i] - 1];
  const p = parseT(H.t[i]);
  const solarUsed = H.s2l[i] + H.chPv[i];
  const chg = H.chPv[i] + H.chGrid[i];
  const dis = H.dis[i];
  const battKw = chg > 0 ? chg : dis;
  const battColor = chg > 0 ? (H.chPv[i] >= H.chGrid[i] ? C.solar : C.grid) : C.battery;
  const served = H.load[i] - H.unmet[i];
  const ahPct = (H.ah[i] - 0) / BAT_MAX;

  const step = useCallback(
    (d: number) => {
      setPlaying(false);
      setHour((hourRef.current + d + N) % N);
    },
    [setHour]
  );

  return (
    <div className="rounded-[28px] bg-night2/70 p-3 ring-1 ring-white/10 sm:p-5">
      {/* Diagram */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="relative overflow-hidden rounded-[20px] bg-night ring-1 ring-white/5">
          <svg viewBox={`0 0 ${L.w} ${L.h}`} className="block h-auto w-full" role="img" aria-label="Live energy flow between solar, grid, battery and house load">
            <defs>
              <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.06)" />
              </pattern>
            </defs>
            <rect width={L.w} height={L.h} fill="url(#dots)" />

            <Edge d={L.e.solar} kw={solarUsed} color={C.solar} label={`${fmt(solarUsed)} kW`} lx={L.l.solar[0]} ly={L.l.solar[1]} />
            <Edge d={L.e.grid} kw={H.imp[i]} color={C.grid} label={`${fmt(H.imp[i])} kW`} lx={L.l.grid[0]} ly={L.l.grid[1]} />
            <Edge
              d={L.e.batt}
              kw={battKw}
              color={battColor}
              reverse={chg <= 0}
              label={`${chg > 0 ? "+" : dis > 0 ? "-" : ""}${fmt(battKw)} kW`}
              lx={L.l.batt[0]}
              ly={L.l.batt[1]}
            />
            <Edge d={L.e.home} kw={served} color="#E6ECF5" label={`${fmt(served)} kW`} lx={L.l.home[0]} ly={L.l.home[1]} />

            <Node
              x={L.n.solar[0]}
              y={L.n.solar[1]}
              w={L.nw}
              color={C.solar}
              title="Solar PV"
              status={H.sun[i] === 1}
              value={fmt(H.pv[i])}
              unit="kW"
              sub={H.spill[i] > 0.005 ? `${fmt(H.spill[i])} kW unused, battery full` : "3 kW peak panel"}
              subColor={H.spill[i] > 0.005 ? "#F6C760" : undefined}
            />
            <Node
              x={L.n.grid[0]}
              y={L.n.grid[1]}
              w={L.nw}
              color={C.grid}
              title="Utility grid"
              status={H.grid[i] === 1}
              value={fmt(H.imp[i])}
              unit="kW"
              sub={H.grid[i] === 1 ? `Billed at ₹7 per kWh` : "Outage, no supply"}
              subColor={H.grid[i] === 1 ? undefined : "#FF8A8A"}
            />
            <Node
              x={L.n.batt[0]}
              y={L.n.batt[1]}
              w={L.nw}
              color={C.battery}
              title="Battery"
              value={H.ah[i].toFixed(0)}
              unit="Ah"
              sub={chg > 0 ? `Charging from ${H.chPv[i] >= H.chGrid[i] ? "solar" : "grid"}` : dis > 0 ? "Discharging to load" : "Idle"}
            >
              <rect x={L.nw - 108} y={56} width={88} height={10} rx={5} fill="rgba(255,255,255,0.1)" />
              <motion.rect
                x={L.nw - 108}
                y={56}
                height={10}
                rx={5}
                fill={H.ah[i] <= BAT_MIN + 0.05 ? C.alert : C.battery}
                initial={false}
                animate={{ width: Math.max(4, 88 * ahPct) }}
                transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
              />
              <line x1={L.nw - 108 + 88 * (BAT_TOPUP / BAT_MAX)} x2={L.nw - 108 + 88 * (BAT_TOPUP / BAT_MAX)} y1={52} y2={70} stroke="rgba(255,255,255,0.35)" />
            </Node>
            <Node
              x={L.n.home[0]}
              y={L.n.home[1]}
              w={L.nw}
              color="#E6ECF5"
              title="House load"
              value={fmt(H.load[i])}
              unit="kW"
              sub={H.unmet[i] > 0.005 ? `${fmt(H.unmet[i])} kW not served` : "Fully served"}
              subColor={H.unmet[i] > 0.005 ? "#FF8A8A" : "#7FE3BC"}
            />

            {/* Controller */}
            <g transform={`translate(${L.c[0]} ${L.c[1]})`}>
              <motion.rect
                width={216}
                height={160}
                rx={20}
                fill="#13253f"
                strokeWidth={2}
                initial={false}
                animate={{ stroke: cs.color }}
                transition={{ duration: 0.3 }}
              />
              <text x={108} y={34} textAnchor="middle" fontSize={13} fill="rgba(255,255,255,0.6)">
                IoT controller
              </text>
              <text x={108} y={78} textAnchor="middle" fontSize={34} fontWeight={600} fill="#fff" fontFamily="var(--font-display)">
                Case {cs.id}
              </text>
              <text x={108} y={106} textAnchor="middle" fontSize={14} fill="rgba(255,255,255,0.85)">
                {cs.title}
              </text>
              <text x={108} y={136} textAnchor="middle" fontSize={12.5} fill="rgba(255,255,255,0.5)">
                {cs.supplier} supplies the load
              </text>
            </g>
          </svg>
        </div>

        {/* Readout */}
        <div className="flex flex-col gap-4 rounded-[20px] bg-night p-5 text-white ring-1 ring-white/5">
          <div>
            <div className="text-sm text-white/55">Time</div>
            <div className="mt-1 font-mono text-[1.65rem] leading-none">{hourLabel(p.hour)}</div>
            <div className="mt-1.5 text-sm text-white/75">{fullLabel(H.t[i])}</div>
          </div>
          <div className="h-px bg-white/10" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-white/55">Cost this hour</div>
              <div className="mt-1 font-mono text-xl">{inr(H.costW[i], 2)}</div>
            </div>
            <div>
              <div className="text-sm text-white/55">Grid only</div>
              <div className="mt-1 font-mono text-xl text-white/60">{inr(H.costWo[i], 2)}</div>
            </div>
          </div>
          <div className="text-sm text-white/55">
            Outside temperature <span className="font-mono text-white/85">{H.temp[i].toFixed(1)} °C</span>
          </div>
          <div className="h-px bg-white/10" />
          <motion.p
            key={cs.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.3 }}
            className="text-[0.92rem] leading-relaxed text-white/80"
          >
            {cs.rule}
          </motion.p>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-3 px-1">
        <button
          onClick={() => setPlaying((v) => !v)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-night transition hover:bg-white/90"
          aria-label={playing ? "Pause simulation" : "Play simulation"}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M3 1.5 L12 7 L3 12.5 Z" fill="currentColor" />
            </svg>
          )}
          {playing ? "Pause" : "Play the month"}
        </button>
        <div className="flex gap-1.5">
          <button onClick={() => step(-1)} aria-label="Previous hour" className="h-11 w-11 rounded-full bg-white/8 text-white ring-1 ring-white/10 transition hover:bg-white/15">
            <svg width="16" height="16" viewBox="0 0 16 16" className="mx-auto" aria-hidden>
              <path d="M10 3 L5 8 L10 13" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button onClick={() => step(1)} aria-label="Next hour" className="h-11 w-11 rounded-full bg-white/8 text-white ring-1 ring-white/10 transition hover:bg-white/15">
            <svg width="16" height="16" viewBox="0 0 16 16" className="mx-auto" aria-hidden>
              <path d="M6 3 L11 8 L6 13" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <Segmented
          dark
          label="Playback speed"
          value={speed}
          onChange={setSpeed}
          options={[
            { value: "1", label: "1x" },
            { value: "4", label: "4x" },
            { value: "12", label: "12x" },
          ]}
        />
        <div className="ml-auto hidden text-sm text-white/45 md:block">Drag the timeline or use the arrow keys</div>
      </div>

      <Timeline hour={hour} setHour={(h) => { setPlaying(false); setHour(h); }} step={step} />

      {/* Scenes */}
      <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {scenes.map((s) => {
          const active = H.case[s.i] === H.case[hour] && Math.abs(s.i - hour) < 1;
          return (
            <button
              key={s.label}
              onClick={() => {
                setPlaying(false);
                setHour(s.i);
              }}
              className={`group rounded-2xl px-4 py-3 text-left ring-1 transition ${
                active ? "bg-white/12 ring-white/30" : "bg-white/[0.04] ring-white/10 hover:bg-white/8"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="h-2 w-2 rounded-full" style={{ background: caseColor(H.case[s.i]) }} />
                {s.label}
              </div>
              <div className="mt-1 text-[0.82rem] leading-snug text-white/55">{s.hint}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Timeline({ hour, setHour, step }: { hour: number; setHour: (h: number) => void; step: (d: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pick = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setHour(Math.min(N - 1, Math.floor(f * N)));
  };

  const weekTicks = DAYS.filter((d) => d.i % 7 === 0);

  return (
    <div className="mt-5 px-1">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Hour of the month"
        aria-valuemin={0}
        aria-valuemax={N - 1}
        aria-valuenow={hour}
        aria-valuetext={`${fullLabel(H.t[hour])}, ${hourLabel(parseT(H.t[hour]).hour)}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
          if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
          if (e.key === "PageDown") { e.preventDefault(); step(24); }
          if (e.key === "PageUp") { e.preventDefault(); step(-24); }
        }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          pick(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && pick(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        className="relative h-14 cursor-pointer touch-none select-none overflow-hidden rounded-xl bg-night ring-1 ring-white/10"
      >
        <svg viewBox={`0 0 ${N} 56`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {H.case.map((c, k) => (
            <rect key={k} x={k} y={0} width={1.05} height={56} fill={caseColor(c)} opacity={0.75} />
          ))}
          <polyline
            points={H.load.map((v, k) => `${k + 0.5},${54 - (v / 3) * 46}`).join(" ")}
            fill="none"
            stroke="rgba(8,18,31,0.55)"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <motion.div
          className="pointer-events-none absolute top-0 h-full w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_3px_rgba(8,18,31,0.6)]"
          initial={false}
          animate={{ left: `${((hour + 0.5) / N) * 100}%` }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      </div>
      <div className="relative mt-2 h-5 text-[0.75rem] text-white/45">
        {weekTicks.map((d) => (
          <span key={d.date} className={`absolute whitespace-nowrap ${d.i === 28 ? "hidden sm:inline" : ""}`} style={{ left: `${(d.lo / N) * 100}%`, transform: d.lo / N > 0.9 ? "translateX(-100%)" : undefined }}>
            {d.label}
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.8rem] text-white/70">
        {CASES.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c.color }} />
            Case {c.id}, {c.title.toLowerCase()}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0 w-4 border-t border-white/60" />
          Load
        </span>
      </div>
    </div>
  );
}
