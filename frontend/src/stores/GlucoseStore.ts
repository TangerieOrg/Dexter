import { createStore, createUseStore } from "@tangerie/global-store";
import { getLatestTwo, getRange, Reading, Series } from "@modules/api";
import { RANGES } from "@modules/glucose";

const REFRESH_MS = 60_000;
// The server backfills holes after signal loss, so occasionally refetch the whole window
const FULL_REFRESH_EVERY = 15;
const RANGE_KEY = "dexter.range";

const EMPTY : Series = { t: [], v: [] };

interface State {
    hours: number;
    series: Series;
    latest?: Reading;
    previous?: Reading;
    error?: string;
    loading: boolean;
}

const loadHours = () => {
    try {
        const h = parseInt(localStorage.getItem(RANGE_KEY) ?? "");
        return (RANGES as readonly number[]).includes(h) ? h : 3;
    } catch {
        return 3;
    }
}

const initial : State = {
    hours: loadHours(),
    series: EMPTY,
    loading: true
}

export const GlucoseStore = createStore({
    state: initial,
    actions: {
        setHours(state, hours : number) {
            if(state.hours === hours) return;
            state.hours = hours;
            state.series = EMPTY;
            state.loading = true;
            try {
                localStorage.setItem(RANGE_KEY, String(hours));
            } catch { }
        },
        setData(state, series : Series, latest : Reading[]) {
            state.series = series;
            state.latest = latest.at(-1);
            state.previous = latest.length > 1 ? latest[0] : undefined;
            state.error = undefined;
            state.loading = false;
        },
        setError(state, error : string) {
            state.error = error;
            state.loading = false;
        }
    }
});

export const useGlucoseStore = createUseStore(GlucoseStore);

export const selectHours = (state : State) => state.hours;
export const selectSeries = (state : State) => state.series;
export const selectLatest = (state : State) => state.latest;
export const selectPrevious = (state : State) => state.previous;
export const selectError = (state : State) => state.error;
export const selectLoading = (state : State) => state.loading;

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

let controller : AbortController | undefined;
let count = 0;

export function refresh() {
    // A newer request always wins over a slow older one
    controller?.abort();
    const ctrl = controller = new AbortController();

    const { hours, series: current } = GlucoseStore.get();
    const full = count++ % FULL_REFRESH_EVERY === 0 || current.t.length === 0;
    const from = Date.now() - hours * 60 * 60 * 1000;
    const since = full ? from : Math.max(from, (current.t.at(-1) ?? from) + 1);

    Promise.all([getRange(since, ctrl.signal), getLatestTwo(ctrl.signal)]).then(([range, latest]) => {
        if(ctrl.signal.aborted) return;
        GlucoseStore.actions.setData(full ? range : mergeSeries(GlucoseStore.get().series, range, from), latest);
    }).catch((err : Error) => {
        if(ctrl.signal.aborted) return;
        GlucoseStore.actions.setError(err.message);
    });
}

export function startRefreshing() {
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);

    // iOS pauses timers while the PWA is in the background, refresh as soon as it's back
    const onVisible = () => {
        if(document.visibilityState === "visible") refresh();
    }
    // pageshow also fires on first load, only care about bfcache restores
    const onPageShow = (e : PageTransitionEvent) => {
        if(e.persisted) refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", refresh);

    const unsubscribe = GlucoseStore.subscribe(selectHours, () => {
        count = 0;
        refresh();
    });

    return () => {
        controller?.abort();
        clearInterval(interval);
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("pageshow", onPageShow);
        window.removeEventListener("online", refresh);
        unsubscribe();
    }
}
