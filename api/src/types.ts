// Index order matches Dexcom's numeric trend codes
export const TRENDS = ["None", "DoubleUp", "SingleUp", "FortyFiveUp", "Flat", "FortyFiveDown", "SingleDown", "DoubleDown", "NotComputable", "RateOutOfRange"] as const;
export type GlucoseTrend = (typeof TRENDS)[number];

export const TREND_ARROWS : Record<GlucoseTrend, string> = {
    None: "",
    DoubleUp: "↑↑",
    SingleUp: "↑",
    FortyFiveUp: "↗",
    Flat: "→",
    FortyFiveDown: "↘",
    SingleDown: "↓",
    DoubleDown: "↓↓",
    NotComputable: "?",
    RateOutOfRange: "-"
};

export const MMOL_L_CONVERSION_FACTOR = 0.0555;

// Same rounding dexcom.js used so stored values stay comparable
export const mgToMmol = (mg : number) => Math.round(mg * MMOL_L_CONVERSION_FACTOR * 100) / 100;
export const mmolToMg = (mmol : number) => Math.round(mmol / MMOL_L_CONVERSION_FACTOR);

export interface Reading {
    date: number;
    mg_dl: number;
    mmol: number;
    trend: GlucoseTrend;
}

// Shape served since the redis days, PicoDexter depends on it
export interface ApiReading {
    value: number,
    trend: GlucoseTrend,
    trendArrow: string,
    date: number
}

export const toApi = (r : Reading) : ApiReading => ({
    value: r.mmol,
    trend: r.trend,
    trendArrow: TREND_ARROWS[r.trend] ?? "?",
    date: r.date
});
