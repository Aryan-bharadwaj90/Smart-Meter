import hourlyRaw from "@/data/hourly.json";
import lstmRaw from "@/data/lstm.json";

export type Hourly = {
  t: string[];
  case: number[];
  pv: number[];
  load: number[];
  temp: number[];
  ah: number[];
  chPv: number[];
  chGrid: number[];
  dis: number[];
  imp: number[];
  unmet: number[];
  costW: number[];
  costWo: number[];
  s2l: number[];
  g2l: number[];
  spill: number[];
  grid: number[];
  sun: number[];
};

export type ModelResult = { y_test: number[]; y_pred: number[]; mae: number; r2: number; t: string[] };
export type ModelKey = "load" | "pv" | "cost";

export const H = hourlyRaw as Hourly;
export const LSTM = lstmRaw as unknown as Record<ModelKey, ModelResult>;
export const N = H.t.length;

export const TARIFF = 7;
export const BAT_MIN = 20;
export const BAT_MAX = 100;
export const BAT_TOPUP = 60;

export const C = {
  solar: "#E89F00",
  battery: "#16A672",
  grid: "#2F7BE0",
  alert: "#E04848",
  pred: "#6A55E0",
  case2: "#EB6834",
  ink: "#0F1E33",
  ink2: "#4A5B73",
  muted: "#7D8BA0",
  line: "#E3E8EF",
  without: "#B7C1CE",
};

export type CaseInfo = {
  id: number;
  grid: boolean;
  sun: boolean;
  supplier: string;
  color: string;
  title: string;
  rule: string;
};

export const CASES: CaseInfo[] = [
  {
    id: 1,
    grid: true,
    sun: true,
    supplier: "Solar",
    color: C.solar,
    title: "Grid on, solar on",
    rule: `Solar supplies the load and surplus charges the battery. Any shortfall is bought from the grid, which also tops up the battery below ${BAT_TOPUP} Ah. Nothing is exported.`,
  },
  {
    id: 2,
    grid: false,
    sun: true,
    supplier: "Solar",
    color: C.case2,
    title: "Grid off, solar on",
    rule: "Solar supplies the load and surplus charges the battery. With the grid off, any shortfall is drawn from the battery.",
  },
  {
    id: 3,
    grid: false,
    sun: false,
    supplier: "Battery",
    color: C.battery,
    title: "Grid off, solar off",
    rule: `The battery supplies the whole load until it reaches ${BAT_MIN} Ah. Load beyond that goes unserved.`,
  },
  {
    id: 4,
    grid: true,
    sun: false,
    supplier: "Grid",
    color: C.grid,
    title: "Grid on, solar off",
    rule: `The grid supplies the whole load and tops up the battery when it is below ${BAT_TOPUP} Ah.`,
  },
];

export const caseColor = (id: number) => CASES[id - 1].color;

const sum = (a: number[], lo: number, hi: number) => {
  let s = 0;
  for (let i = lo; i <= hi; i++) s += a[i];
  return s;
};

export type Metrics = ReturnType<typeof metrics>;

export function metrics(lo = 0, hi = N - 1) {
  const load = sum(H.load, lo, hi);
  const costWo = sum(H.costWo, lo, hi);
  const costW = sum(H.costW, lo, hi);
  const solar = sum(H.s2l, lo, hi);
  const batt = sum(H.dis, lo, hi);
  const grid = sum(H.g2l, lo, hi);
  const unmet = sum(H.unmet, lo, hi);
  const chPv = sum(H.chPv, lo, hi);
  const chGrid = sum(H.chGrid, lo, hi);
  const pv = sum(H.pv, lo, hi);
  const spill = sum(H.spill, lo, hi);
  const imp = sum(H.imp, lo, hi);
  let unmetHours = 0;
  let minHours = 0;
  for (let i = lo; i <= hi; i++) {
    if (H.unmet[i] > 0) unmetHours++;
    if (H.ah[i] <= BAT_MIN + 0.05) minHours++;
  }
  const saved = costWo - costW;
  return {
    hours: hi - lo + 1,
    days: Math.round((hi - lo + 1) / 24),
    load,
    costWo,
    costW,
    saved,
    savedPct: costWo ? (100 * saved) / costWo : 0,
    solar,
    batt,
    grid,
    unmet,
    unmetHours,
    selfShare: load ? (100 * (solar + batt)) / load : 0,
    chPv,
    chGrid,
    chTotal: chPv + chGrid,
    chPvShare: chPv + chGrid ? (100 * chPv) / (chPv + chGrid) : 0,
    pv,
    spill,
    pvUsedPct: pv ? (100 * (solar + chPv)) / pv : 0,
    imp,
    minHours,
  };
}

export type Day = {
  i: number;
  date: string;
  label: string;
  lo: number;
  hi: number;
  solar: number;
  battery: number;
  grid: number;
  unserved: number;
  costW: number;
  costWo: number;
  chPv: number;
  chGrid: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function parseT(t: string) {
  const [d, h] = t.split("T");
  const [y, m, dd] = d.split("-").map(Number);
  const hour = Number(h.slice(0, 2));
  return { y, m, d: dd, hour, date: d };
}

export function dayLabel(t: string) {
  const p = parseT(t);
  return `${String(p.d).padStart(2, "0")} ${MONTHS[p.m - 1]}`;
}

export function fullLabel(t: string) {
  const p = parseT(t);
  const wd = WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
  return `${wd}, ${String(p.d).padStart(2, "0")} ${MONTHS[p.m - 1]} ${p.y}`;
}

export function hourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

export const DAYS: Day[] = (() => {
  const out: Day[] = [];
  let start = 0;
  for (let i = 1; i <= N; i++) {
    if (i === N || parseT(H.t[i]).date !== parseT(H.t[start]).date) {
      const lo = start;
      const hi = i - 1;
      out.push({
        i: out.length,
        date: parseT(H.t[lo]).date,
        label: dayLabel(H.t[lo]),
        lo,
        hi,
        solar: sum(H.s2l, lo, hi),
        battery: sum(H.dis, lo, hi),
        grid: sum(H.g2l, lo, hi),
        unserved: sum(H.unmet, lo, hi),
        costW: sum(H.costW, lo, hi),
        costWo: sum(H.costWo, lo, hi),
        chPv: sum(H.chPv, lo, hi),
        chGrid: sum(H.chGrid, lo, hi),
      });
      start = i;
    }
  }
  return out;
})();

export function caseStats(id: number) {
  let hours = 0,
    load = 0,
    imp = 0,
    costW = 0,
    costWo = 0,
    unmet = 0;
  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    if (H.case[i] !== id) continue;
    hours++;
    load += H.load[i];
    imp += H.imp[i];
    costW += H.costW[i];
    costWo += H.costWo[i];
    unmet += H.unmet[i];
    idx.push(i);
  }
  return { hours, share: (100 * hours) / N, load, imp, costW, costWo, saved: costWo - costW, unmet, idx };
}

export const inr = (x: number, dec = 0) =>
  "₹" + x.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const num = (x: number, dec = 1) =>
  x.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
