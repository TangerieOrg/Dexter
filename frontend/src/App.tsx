import { useEffect, useState } from "preact/hooks";
import Chart from "./Chart";
import { Reading } from "./api";
import { predict, Prediction, RANGES, rangeColor, rangeLabel, TREND_INFO } from "./glucose";
import { GlucoseStore, selectError, selectHours, selectLatest, selectLoading, selectPrevious, selectSeries, startRefreshing, useGlucoseStore } from "./stores/GlucoseStore";

const STALE_MS = 10 * 60 * 1000;
const DELTA_MAX_MS = 15 * 60 * 1000;

function useNow(every = 15_000) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), every);
        const onVisible = () => setNow(Date.now());
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
        }
    }, [every]);
    return now;
}

const formatAgo = (ms : number) => {
    const mins = Math.floor(ms / 60_000);
    if(mins < 1) return "just now";
    if(mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if(hrs < 48) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} days ago`;
}

const formatClock = (ms : number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function PredictionText({ p } : { p: Prediction }) {
    const value = (v : number) => <span style={{ color: rangeColor(v) }}>{v.toFixed(1)}</span>;
    return <span class="ml-2 whitespace-nowrap text-lg tabular-nums text-zinc-400">
        {
            p.openHigh ? <>&gt; {value(p.lo)}</> :
            p.openLow ? <>&lt; {value(p.hi)}</> :
            <>{value(p.lo)}–{value(p.hi)}</>
        }
        <span class="ml-1 text-xs">by {formatClock(p.t1)}</span>
    </span>
}

function Current({ latest, previous, now } : { latest: Reading, previous?: Reading, now: number }) {
    const stale = now - latest.date > STALE_MS;
    const info = TREND_INFO[latest.trend];
    const prediction = predict(latest);
    const hasDelta = previous && latest.date - previous.date <= DELTA_MAX_MS;
    const delta = hasDelta ? latest.value - previous.value : 0;

    return <div class={`flex flex-col items-center text-center ${stale ? "opacity-60" : ""}`}>
        <div class="flex items-start gap-3">
            <h1 class="text-8xl font-thin tabular-nums leading-none sm:text-9xl" style={{ color: rangeColor(latest.value) }}>
                {latest.value.toFixed(1)}
            </h1>
            <span class="mt-2 text-5xl font-light text-zinc-300 sm:text-6xl" aria-label={latest.trend}>{latest.trendArrow}</span>
        </div>
        <span class="mt-1 text-sm font-light uppercase tracking-widest text-zinc-500">mmol/L</span>
        <span class="mt-3 text-2xl font-light tabular-nums text-zinc-300">
            {
                hasDelta ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}` : "—"
            }
        </span>
        <span class="mt-4 text-2xl font-light">
            {info?.label ?? latest.trend}
            {
                prediction && <PredictionText p={prediction}/>
            }
        </span>
        <span class={`mt-3 text-sm ${stale ? "font-medium text-amber-400" : "text-zinc-500"}`}>
            {stale ? "No recent reading · " : ""}{formatAgo(now - latest.date)}
        </span>
    </div>
}

export default function App() {
    const hours = useGlucoseStore(selectHours);
    const series = useGlucoseStore(selectSeries);
    const latest = useGlucoseStore(selectLatest);
    const previous = useGlucoseStore(selectPrevious);
    const error = useGlucoseStore(selectError);
    const loading = useGlucoseStore(selectLoading);
    const now = useNow();

    useEffect(() => startRefreshing(), []);

    return <main class="safe-area flex min-h-dvh flex-col lg:h-dvh lg:flex-row">
        <section class="flex flex-col items-center justify-center px-4 pb-6 pt-12 lg:max-w-md lg:basis-[28rem] lg:py-10">
            {
                latest ? <Current latest={latest} previous={previous} now={now}/> :
                loading ? <span class="text-xl font-light text-zinc-500">Loading…</span> :
                <span class="text-xl font-light text-zinc-400">{error ?? "No readings yet"}</span>
            }
            {
                latest && error && <span class="mt-4 rounded bg-red-950 px-2 py-1 text-xs text-red-300">Offline: {error}</span>
            }
        </section>
        <section class="flex flex-1 flex-col px-2 pb-4 lg:py-6 lg:pr-6">
            <div class="mb-2 flex justify-center gap-1 lg:justify-end">
                {
                    RANGES.map(x => <button
                        key={x}
                        class={`rounded-full px-3 py-1 text-sm transition-colors ${x === hours ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:bg-zinc-800"}`}
                        onClick={() => GlucoseStore.actions.setHours(x)}
                    >
                        {rangeLabel(x)}
                    </button>)
                }
            </div>
            <div class="relative min-h-56 flex-1">
                <Chart series={series} hours={hours} prediction={latest && predict(latest)}/>
            </div>
        </section>
    </main>
}
