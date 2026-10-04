export const API_ROOT = `${import.meta.env.BASE_URL}api`;

export interface Reading {
    value: number,
    trend: GlucoseTrend,
    trendArrow: string,
    date: number
}

export interface Series {
    t: number[],
    v: number[]
}

export type GlucoseTrend = "None" | "DoubleUp" | "SingleUp" | "FortyFiveUp" | "Flat" | "FortyFiveDown" | "SingleDown" | "DoubleDown" | "NotComputable" | "RateOutOfRange";

export async function apiFetch<T>(path : string, signal? : AbortSignal) : Promise<T> {
    const res = await fetch(`${API_ROOT}${path}`, { signal, cache: "no-store" });
    const text = await res.text();

    let body : any;
    try {
        body = JSON.parse(text);
    } catch {
        // nginx error pages are html
        throw new Error(res.ok ? "Invalid response" : `API unavailable (${res.status})`);
    }

    if(!res.ok) throw new Error(body?.error ?? `API error (${res.status})`);
    return body as T;
}

export const getRange = (from : number, signal? : AbortSignal) => apiFetch<Series>(`/glucose/range?from=${Math.floor(from)}`, signal);
export const getLatestTwo = (signal? : AbortSignal) => apiFetch<Reading[]>("/glucose/query?length=2", signal);
