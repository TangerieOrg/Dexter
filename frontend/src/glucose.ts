import { GlucoseTrend } from "./api";

export const LOW = 3.9;
export const HIGH = 10;

export const RANGE_COLORS = {
    low: "#f87171",
    in: "#34d399",
    high: "#fbbf24"
};

export const rangeColor = (v : number) => v < LOW ? RANGE_COLORS.low : v > HIGH ? RANGE_COLORS.high : RANGE_COLORS.in;

// Dexcom's arrow thresholds are 1/2/3 mg/dL per minute, shown here as mmol/L per 30 minutes
export const TREND_INFO : Partial<Record<GlucoseTrend, { label: string, rate: string }>> = {
    DoubleUp: { label: "Rising quickly", rate: "> +5" },
    SingleUp: { label: "Rising", rate: "+3.3 to +5" },
    FortyFiveUp: { label: "Rising slowly", rate: "+1.7 to +3.3" },
    Flat: { label: "Steady", rate: "± 1.7" },
    FortyFiveDown: { label: "Falling slowly", rate: "-1.7 to -3.3" },
    SingleDown: { label: "Falling", rate: "-3.3 to -5" },
    DoubleDown: { label: "Falling quickly", rate: "< -5" },
    NotComputable: { label: "No trend", rate: "" },
    RateOutOfRange: { label: "Rate out of range", rate: "" }
};

export const RANGES = [3, 6, 12, 24, 168] as const;
export const rangeLabel = (h : number) => h > 24 && h % 24 === 0 ? `${h / 24}d` : `${h}h`;
