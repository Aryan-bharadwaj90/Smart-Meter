"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { H, LSTM, N, TARIFF, inr, metrics, num } from "@/lib/data";
import Battery from "./Battery";
import CostEnergy from "./CostEnergy";
import Forecast from "./Forecast";
import LoadSolar from "./LoadSolar";
import Nav from "./Nav";
import { Cases, Results } from "./ResultsCases";
import Simulator from "./Simulator";
import { Section } from "./ui";

/* ---------------------------------------------------------------------------
   Edit these lines to put your names on the page.
--------------------------------------------------------------------------- */
const INSTITUTION = "Thapar Institute of Engineering and Technology, Patiala";
const TEAM = ""; // for example: "Nikunj Garg, Name Two"
const GUIDE = ""; // for example: "Dr. Name"

function firstMiddayHour() {
  for (let i = 0; i < N; i++) if (H.case[i] === 1 && H.chPv[i] > 0.2) return i;
  return 12;
}

export default function Dashboard() {
  const [hour, setHourState] = useState(firstMiddayHour);
  const setHour = useCallback((h: number) => setHourState(h), []);
  const reduce = useReducedMotion();

  const jumpTo = useCallback((h: number) => {
    setHourState(h);
    document.getElementById("simulator")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [reduce]);

  return (
    <>
      <Nav />
      <main>
        <div id="hero" className="relative overflow-hidden bg-night text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(closest-side, rgba(232,159,0,0.35), rgba(47,123,224,0.18), transparent)" }}
          />
          <div className="relative mx-auto max-w-[1200px] px-4 pb-16 pt-28 sm:px-8 sm:pt-32">
            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[820px]"
            >
              <p className="text-[0.95rem] text-white/60">
                IoT and machine learning project, {INSTITUTION}
              </p>
              <h1 className="mt-4 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[4.2rem]">
                Smart Energy Management System
              </h1>
              <p className="mt-5 max-w-[60ch] text-[1.1rem] leading-relaxed text-white/75">
                Rooftop solar, a 1.2 kWh battery and the utility grid, coordinated hour by hour by an IoT controller. LSTM networks forecast load, solar output and cost. Press play to watch a month of the house run.
              </p>
              {(TEAM || GUIDE) && (
                <p className="mt-4 text-sm text-white/55">
                  {TEAM && <>Team: {TEAM}</>}
                  {TEAM && GUIDE && <span className="mx-3 text-white/25">|</span>}
                  {GUIDE && <>Guide: {GUIDE}</>}
                </p>
              )}
            </motion.div>
            <motion.div
              id="simulator"
              className="mt-12 scroll-mt-20"
              initial={{ opacity: 0, y: reduce ? 0 : 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <Simulator hour={hour} setHour={setHour} />
            </motion.div>
          </div>
        </div>

        <Results />
        <div className="border-t border-line" />
        <Cases jumpTo={jumpTo} />
        <div className="border-t border-line" />
        <CostEnergy />
        <div className="border-t border-line" />
        <Battery />
        <div className="border-t border-line" />
        <LoadSolar />
        <div className="border-t border-line" />
        <Forecast />
        <Conclusion />
      </main>
      <Footer />
    </>
  );
}

function Conclusion() {
  const m = useMemo(() => metrics(), []);
  const cols = [
    {
      title: "What the results show",
      items: [
        `The monthly bill fell from ${inr(m.costWo, 2)} to ${inr(m.costW, 2)}, a saving of ${inr(m.saved, 2)} (${m.savedPct.toFixed(1)}%).`,
        `Solar and the battery supplied ${m.selfShare.toFixed(1)}% of the household load.`,
        `${m.chPvShare.toFixed(1)}% of battery charging came free from solar. Grid charging cost ${inr(m.chGrid * TARIFF)}.`,
        `On unseen hours the LSTM models reached R² of ${LSTM.load.r2.toFixed(2)} for load, ${LSTM.pv.r2.toFixed(2)} for solar and ${LSTM.cost.r2.toFixed(2)} for cost.`,
      ],
    },
    {
      title: "Limitations",
      items: [
        "The data is a simulated month. Results from the real hardware may differ.",
        `The 1.2 kWh battery could not cover ${m.unmetHours} outage hours, leaving ${num(m.unmet)} kWh unserved.`,
        `With export disabled, ${num((100 * m.spill) / m.pv)}% of solar energy was lost while the battery was full.`,
        "Forecast accuracy is moderate. One month is a small training set.",
      ],
    },
    {
      title: "Next steps",
      items: [
        "Replace the sample data with readings from the IoT hardware.",
        "Size the battery against the observed outage hours.",
        "Compare against a net metering option for surplus solar.",
        "Forecast several hours ahead so the controller can plan battery charging in advance.",
      ],
    },
  ];
  return (
    <div className="bg-night text-white">
      <Section id="conclusion" title="Conclusion" dark>
        <div className="-mt-2 grid gap-10 md:grid-cols-3">
          {cols.map((c, k) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: k * 0.12 }}
            >
              <h3 className="border-b border-white/15 pb-3 font-display text-xl font-semibold">{c.title}</h3>
              <ul className="mt-4 space-y-3">
                {c.items.map((it) => (
                  <li key={it} className="flex gap-3 text-[0.98rem] leading-relaxed text-white/75">
                    <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-solar" />
                    {it}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-night text-white/55">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          Smart Energy Management System. {INSTITUTION}.
          <br />
          Data: {N} simulated hourly readings, one month. Tariff ₹{TARIFF} per kWh.
        </div>
        <a
          href="/data/smart_meter_clean.csv"
          download
          className="inline-flex h-10 items-center justify-center rounded-full bg-white/10 px-5 font-medium text-white ring-1 ring-white/15 transition hover:bg-white/15"
        >
          Download the dataset (CSV)
        </a>
      </div>
    </footer>
  );
}
