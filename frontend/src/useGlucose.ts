import { useEffect, useRef, useState } from "preact/hooks";
import { getLatestTwo, getRange, Reading, Series } from "./api";

const REFRESH_MS = 60_000;
// The server backfills holes after signal loss, so occasionally refetch the whole window
const FULL_REFRESH_EVERY = 15;

interface State {
    series: Series;
    latest?: Reading;
    previous?: Reading;
    error?: string;
    loading: boolean;
}

const EMPTY : Series = { t: [], v: [] };

// Appends points newer than what we have and drops ones that fell out of the window
function mergeSeries(a : Series, b : Series, from : number) : Series {
    const last = a.t.at(-1) ?? -Infinity;
    const t : number[] = [];
    const v : number[] = [];
    for(let i = 0; i < a.t.length; i++) {
        if(a.t[i] < from) continue;
        t.push(a.t[i]);
        v.push(a.v[i]);
    }
    for(let i = 0; i < b.t.length; i++) {
        if(b.t[i] <= last || b.t[i] < from) continue;
        t.push(b.t[i]);
        v.push(b.v[i]);
    }
    return { t, v };
}

export default function useGlucose(hours : number) {
    const [state, setState] = useState<State>({ series: EMPTY, loading: true });
    const seriesRef = useRef<Series>(EMPTY);

    useEffect(() => {
        let controller : AbortController | undefined;
        let count = 0;
        seriesRef.current = EMPTY;
        setState(s => ({ ...s, series: EMPTY, loading: true }));

        const update = () => {
            // A newer request always wins over a slow older one
            controller?.abort();
            const ctrl = controller = new AbortController();
            const full = count++ % FULL_REFRESH_EVERY === 0 || seriesRef.current.t.length === 0;

            const from = Date.now() - hours * 60 * 60 * 1000;
            const since = full ? from : Math.max(from, (seriesRef.current.t.at(-1) ?? from) + 1);

            Promise.all([getRange(since, ctrl.signal), getLatestTwo(ctrl.signal)]).then(([range, latest]) => {
                if(ctrl.signal.aborted) return;
                const series = full ? range : mergeSeries(seriesRef.current, range, from);
                seriesRef.current = series;
                setState({
                    series,
                    latest: latest.at(-1),
                    previous: latest.length > 1 ? latest[0] : undefined,
                    loading: false
                });
            }).catch((err : Error) => {
                if(ctrl.signal.aborted) return;
                setState(s => ({ ...s, loading: false, error: err.message }));
            });
        }

        update();
        const interval = setInterval(update, REFRESH_MS);

        // iOS pauses timers while the PWA is in the background, refresh as soon as it's back
        const onVisible = () => {
            if(document.visibilityState === "visible") update();
        }
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("pageshow", onVisible);
        window.addEventListener("online", update);

        return () => {
            controller?.abort();
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("pageshow", onVisible);
            window.removeEventListener("online", update);
        }
    }, [hours]);

    return state;
}

export function useNow(every = 15_000) {
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
