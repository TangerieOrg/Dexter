import { GlucoseTrend, Reading } from "./api";

export const LOW = 3.9;
export const HIGH = 10;

export const RANGE_COLORS = {
    low: "#f87171",
    in: "#34d399",
    high: "#fbbf24"
};

export const rangeColor = (v : number) => v < LOW ? RANGE_COLORS.low : v > HIGH ? RANGE_COLORS.high : RANGE_COLORS.in;

export const PREDICT_MS = 15 * 60_000;
export const CONE_MS = 30 * 60_000;
const SENSOR_MIN = 2.2;
const SENSOR_MAX = 22.2;
const MG_TO_MMOL = 0.0555;
// Double arrows are open ended, draw the cone out to 4 mg/dL per minute
const OPEN_MG = 60;

// From dexcom.com trend arrow chart, change in mg/dL over 15 minutes (null = open ended)
export const TREND_INFO : Partial<Record<GlucoseTrend, { label: string, bounds?: [number | null, number | null] }>> = {
    DoubleUp: { label: "Rising quickly", bounds: [45, null] },
    SingleUp: { label: "Rising", bounds: [30, 45] },
    FortyFiveUp: { label: "Rising slowly", bounds: [15, 30] },
    Flat: { label: "Steady", bounds: [-15, 15] },
    FortyFiveDown: { label: "Falling slowly", bounds: [-30, -15] },
    SingleDown: { label: "Falling", bounds: [-45, -30] },
    DoubleDown: { label: "Falling quickly", bounds: [null, -45] },
    NotComputable: { label: "No trend" },
    RateOutOfRange: { label: "Rate out of range" }
};

const clampSensor = (v : number) => Math.min(SENSOR_MAX, Math.max(SENSOR_MIN, v));

export function predict(latest : Pick<Reading, "value" | "trend" | "date">) {
    const bounds = TREND_INFO[latest.trend]?.bounds;
    if(!bounds) return undefined;

    const [loMg, hiMg] = [bounds[0] ?? -OPEN_MG, bounds[1] ?? OPEN_MG];
    const at = (mg : number, scale : number) => clampSensor(latest.value + mg * MG_TO_MMOL * scale);

    return {
        t0: latest.date,
        v0: latest.value,
        t1: latest.date + PREDICT_MS,
        lo: at(loMg, 1),
        hi: at(hiMg, 1),
        openLow: bounds[0] == null,
        openHigh: bounds[1] == null,
        // Same rate carried on to 30 minutes for the graph
        tCone: latest.date + CONE_MS,
        coneLo: at(loMg, CONE_MS / PREDICT_MS),
        coneHi: at(hiMg, CONE_MS / PREDICT_MS)
    }
}

export type Prediction = NonNullable<ReturnType<typeof predict>>;

export const RANGES = [3, 6, 12, 24] as const;
export const rangeLabel = (h : number) => `${h}h`;

// Some locales default to a 0-23 or 0-11 clock, always show 12:06 rather than 0:06
export const formatClock = (ms : number, withMinutes = true) => new Date(ms).toLocaleTimeString([], withMinutes ?
    { hour: "numeric", minute: "2-digit", hourCycle: "h12" } :
    { hour: "numeric", hourCycle: "h12" }
);
