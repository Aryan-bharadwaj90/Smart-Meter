"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { C, LSTM, ModelKey, dayLabel, hourLabel, parseT } from "@/lib/data";
import { AnimatedNumber, ChartTip, Legend, Panel, PanelTitle, Section, WhenVisible, axisProps } from "./ui";

const MODELS: { key: ModelKey; name: string; unit: string; short: string }[] = [
  { key: "load", name: "Household load", unit: "kW", short: "Load" },
  { key: "pv", name: "Solar generation", unit: "kW", short: "Solar" },
  { key: "cost", name: "Hourly cost", unit: "₹", short: "Cost" },
];

const LAYERS = [
  { tag: "Input", title: "24 hours x 13", body: "The last 24 hourly readings" },
  { tag: "Layer 1", title: "LSTM, 32 units", body: "Dropout 0.2" },
  { tag: "Layer 2", title: "LSTM, 16 units", body: "Dropout 0.2" },
  { tag: "Layer 3", title: "Dense, 8 units", body: "ReLU activation" },
  { tag: "Output", title: "Dense, 1 unit", body: "Prediction for the next hour" },
];

function Pipeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const reduce = useReducedMotion();
  return (
    <div ref={ref} className="relative">
      <div className="grid gap-3 md:grid-cols-5">
        {LAYERS.map((l, k) => (
          <motion.div
            key={k}
            className="relative rounded-2xl border border-line bg-white p-4"
            animate={
              inView && !reduce
                ? { borderColor: ["#E3E8EF", "#6A55E0", "#E3E8EF"], boxShadow: ["0 0 0 0 rgba(106,85,224,0)", "0 0 0 4px rgba(106,85,224,0.12)", "0 0 0 0 rgba(106,85,224,0)"] }
                : {}
            }
            transition={{ duration: 1.1, delay: k * 0.35, repeat: Infinity, repeatDelay: LAYERS.length * 0.35 + 0.6 }}
          >
            <div className="text-sm font-medium text-pred">{l.tag}</div>
            <div className="mt-1 font-semibold text-ink">{l.title}</div>
            <div className="mt-1 text-[0.85rem] leading-snug text-ink2">{l.body}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Forecast() {
  const [sel, setSel] = useState<ModelKey>("load");
  const model = MODELS.find((m) => m.key === sel)!;
  const r = LSTM[sel];

  const series = useMemo(() => r.t.map((t, k) => ({ t, actual: r.y_test[k], predicted: r.y_pred[k] })), [r]);
  const points = useMemo(() => r.y_test.map((a, k) => ({ actual: a, predicted: r.y_pred[k] })), [r]);
  const [lo, hi] = useMemo(() => {
    const all = [...r.y_test, ...r.y_pred];
    return [Math.min(0, ...all), Math.max(...all)];
  }, [r]);
  const hist = useMemo(() => {
    const err = r.y_pred.map((p, k) => p - r.y_test[k]);
    const m = Math.max(...err.map(Math.abs));
    const bins = 21;
    const w = (2 * m) / bins;
    const rows = Array.from({ length: bins }, (_, k) => ({ x: -m + (k + 0.5) * w, n: 0 }));
    err.forEach((e) => {
      rows[Math.min(bins - 1, Math.floor((e + m) / w))].n++;
    });
    return rows;
  }, [r]);
  const top = Math.ceil(hi);
  const stepT = top <= 4 ? 0.5 : top <= 12 ? 2 : 5;
  const ticksPV = Array.from({ length: Math.floor(top / stepT) + 1 }, (_, k) => +(k * stepT).toFixed(2));
  const meanAbs = (a: number[]) => a.reduce((s, v) => s + Math.abs(v), 0) / a.length;

  const fmtVal = (v: number) => (model.unit === "₹" ? `₹${v.toFixed(2)}` : `${v.toFixed(2)} kW`);

  return (
    <Section
      id="forecast"
      title="Forecasting with LSTM"
      lead="Three separate LSTM networks look at the last 24 hours and predict the next one. They were trained on the first 80% of the month and tested on the final 144 hours, which they had never seen."
    >
      <Pipeline />
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Features per hour: hour of day as sine and cosine, weekend flag, temperature, load, solar output, battery charge, solar status, grid status and the operating case as four columns. Inputs are scaled with training-period statistics only. Adam optimiser, mean squared error loss, early stopping.
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Forecast model">
        {MODELS.map((m) => {
          const on = m.key === sel;
          const res = LSTM[m.key];
          const rel = (100 * res.mae) / meanAbs(res.y_test);
          return (
            <button
              key={m.key}
              role="tab"
              aria-selected={on}
              onClick={() => setSel(m.key)}
              className={`relative overflow-hidden rounded-2xl border p-5 text-left transition-colors ${
                on ? "border-pred bg-white" : "border-line bg-white/60 hover:bg-white"
              }`}
            >
              {on && <motion.span layoutId="model-bar" className="absolute inset-x-0 top-0 h-1 bg-pred" />}
              <div className="text-sm text-ink2">{m.name}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <AnimatedNumber value={res.r2} format={(v) => v.toFixed(3)} className="font-display text-[2.3rem] font-semibold leading-none text-ink" />
                <span className="text-sm text-muted">R² score</span>
              </div>
              <div className="mt-3 text-[0.85rem] text-muted">
                Average error {m.unit === "₹" ? `₹${res.mae.toFixed(2)}` : `${res.mae.toFixed(3)} kW`}, about {rel.toFixed(0)}% of the mean
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: on ? C.pred : "#B9B0EE" }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${res.r2 * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <Panel className="mt-5">
        <PanelTitle sub="Drag the handles to zoom into a day.">{model.name}: actual and predicted on unseen hours</PanelTitle>
        <Legend
          items={[
            { label: "Actual", color: C.ink },
            { label: "LSTM prediction", color: C.pred },
          ]}
        />
        <WhenVisible height={340}>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} key={sel}>
                <CartesianGrid vertical={false} stroke="#EDF1F6" />
                <XAxis dataKey="t" {...axisProps} tickFormatter={(t: string) => dayLabel(t)} ticks={r.t.filter((t) => parseT(t).hour === 0)} />
                <YAxis {...axisProps} axisLine={false} width={56} tickFormatter={(v) => (model.unit === "₹" ? `₹${v}` : `${v}`)} />
                <Tooltip
                  content={(p) => (
                    <ChartTip {...p} valueFormat={fmtVal} labelFormat={(l) => `${dayLabel(String(l))}, ${hourLabel(parseT(String(l)).hour)}`} />
                  )}
                />
                <Line type="monotone" dataKey="actual" name="Actual" stroke={C.ink} strokeWidth={1.8} dot={false} animationDuration={1000} />
                <Line type="monotone" dataKey="predicted" name="LSTM prediction" stroke={C.pred} strokeWidth={2.2} dot={false} animationDuration={1400} />
                <Brush dataKey="t" height={26} stroke="#9AA8BB" fill="#F7F9FB" travellerWidth={10} tickFormatter={(t: string) => dayLabel(t)} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </WhenVisible>
      </Panel>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelTitle sub="Points on the dashed line are perfect predictions.">Predicted against actual</PanelTitle>
          <WhenVisible height={300}>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, left: -8, bottom: 8 }} key={sel}>
                  <CartesianGrid stroke="#EDF1F6" />
                  <XAxis type="number" dataKey="actual" name="Actual" {...axisProps} domain={[0, top]} ticks={ticksPV} />
                  <YAxis type="number" dataKey="predicted" name="Predicted" {...axisProps} axisLine={false} domain={[0, top]} ticks={ticksPV} width={48} />
                  <ReferenceLine segment={[{ x: 0, y: 0 }, { x: top, y: top }]} stroke="#9AA8BB" strokeDasharray="5 5" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-line bg-white px-3 py-2 text-[0.82rem] shadow-lg">
                          <div className="text-ink2">Actual <span className="tnum font-medium text-ink">{fmtVal(Number(payload[0].payload.actual))}</span></div>
                          <div className="text-ink2">Predicted <span className="tnum font-medium text-ink">{fmtVal(Number(payload[0].payload.predicted))}</span></div>
                        </div>
                      ) : null
                    }
                  />
                  <Scatter data={points} fill={C.pred} fillOpacity={0.55} stroke="#fff" strokeWidth={1} animationDuration={900} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </WhenVisible>
          <div className="mt-1 text-center text-[0.8rem] text-muted">Actual ({model.unit === "₹" ? "₹ per hour" : "kW"}) across, predicted up</div>
        </Panel>
        <Panel>
          <PanelTitle sub="A tall, narrow peak centred on zero means small errors with no consistent bias.">Prediction error</PanelTitle>
          <WhenVisible height={300}>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hist} margin={{ top: 8, right: 8, left: -14, bottom: 8 }} barCategoryGap={2} key={sel}>
                  <CartesianGrid vertical={false} stroke="#EDF1F6" />
                  <XAxis dataKey="x" {...axisProps} tickFormatter={(v: number) => v.toFixed(2)} interval={4} />
                  <YAxis {...axisProps} axisLine={false} allowDecimals={false} width={48} />
                  <ReferenceLine x={hist[Math.floor(hist.length / 2)].x} stroke="#9AA8BB" />
                  <Tooltip
                    cursor={{ fill: "rgba(15,30,51,0.04)" }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-line bg-white px-3 py-2 text-[0.82rem] shadow-lg">
                          Error near <span className="tnum font-medium text-ink">{Number(payload[0].payload.x).toFixed(2)}</span>:{" "}
                          <span className="tnum font-medium text-ink">{payload[0].payload.n} hours</span>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="n" fill={C.pred} radius={[4, 4, 0, 0]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </WhenVisible>
          <div className="mt-1 text-center text-[0.8rem] text-muted">Predicted minus actual ({model.unit === "₹" ? "₹" : "kW"})</div>
        </Panel>
      </div>
    </Section>
  );
}
