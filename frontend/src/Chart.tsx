import { useEffect, useRef } from "preact/hooks";
import uPlot from "uplot";
import { Series } from "./api";
import { HIGH, LOW, rangeColor, RANGE_COLORS } from "./glucose";

// Readings are every 5 minutes, anything longer than this is a gap in the line
const GAP_MS = 15 * 60 * 1000;

const AXIS = {
    stroke: "#a1a1aa",
    grid: { stroke: "#27272a", width: 1 },
    ticks: { stroke: "#27272a", width: 1 },
    font: "12px Roboto, system-ui, sans-serif"
};

interface Props {
    series: Series;
    hours: number;
}

const withGaps = (s : Series) : uPlot.AlignedData => {
    const t : number[] = [];
    const v : Array<number | null> = [];
    for(let i = 0; i < s.t.length; i++) {
        if(i > 0 && s.t[i] - s.t[i - 1] > GAP_MS) {
            t.push(s.t[i - 1] + 1);
            v.push(null);
        }
        t.push(s.t[i]);
        v.push(s.v[i]);
    }
    return [t, v];
}

const formatTime = (ms : number, hours : number) => new Date(ms).toLocaleString([], hours > 24 ?
    { weekday: "short", hour: "numeric", minute: "2-digit" } :
    { hour: "numeric", minute: "2-digit" }
);

// Hard colour stops at the low/high thresholds so the line changes colour as it crosses them
function rangeGradient(u : uPlot) {
    const top = u.bbox.top;
    const bottom = u.bbox.top + u.bbox.height;
    if(!Number.isFinite(top) || bottom <= top) return RANGE_COLORS.in;

    const pct = (v : number) => Math.min(1, Math.max(0, (bottom - u.valToPos(v, "y", true)) / (bottom - top)));
    const lo = pct(LOW);
    const hi = pct(HIGH);

    const g = u.ctx.createLinearGradient(0, bottom, 0, top);
    g.addColorStop(0, RANGE_COLORS.low);
    g.addColorStop(lo, RANGE_COLORS.low);
    g.addColorStop(lo, RANGE_COLORS.in);
    g.addColorStop(hi, RANGE_COLORS.in);
    g.addColorStop(hi, RANGE_COLORS.high);
    g.addColorStop(1, RANGE_COLORS.high);
    return g;
}

export default function Chart({ series, hours } : Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const readoutRef = useRef<HTMLDivElement>(null);
    const plotRef = useRef<uPlot>();
    const hoursRef = useRef(hours);
    const seriesRef = useRef(series);
    hoursRef.current = hours;
    seriesRef.current = series;

    const showReadout = (u : uPlot) => {
        const el = readoutRef.current;
        if(!el) return;
        const idx = u.cursor.idx;
        const value = idx == null ? null : u.data[1][idx];
        if(idx == null || value == null) {
            el.style.opacity = "0";
            return;
        }
        el.style.opacity = "1";
        el.textContent = `${value.toFixed(1)} · ${formatTime(u.data[0][idx], hoursRef.current)}`;
        el.style.color = rangeColor(value);
    }

    useEffect(() => {
        const el = containerRef.current!;

        const u = new uPlot({
            width: el.clientWidth,
            height: el.clientHeight,
            ms: 1,
            pxAlign: false,
            legend: { show: false },
            cursor: {
                drag: { x: false, y: false },
                points: { size: 8, fill: (u, i) => rangeColor(u.data[i][u.cursor.idx ?? 0] ?? 0) },
                y: false
            },
            scales: {
                x: {
                    time: true,
                    range: () => {
                        const now = Date.now();
                        return [now - hoursRef.current * 60 * 60 * 1000, now];
                    }
                },
                y: {
                    range: (_u, min, max) => [Math.min(2, min ?? 2), Math.max(14, Math.ceil((max ?? 0) + 1))]
                }
            },
            axes: [
                {
                    ...AXIS,
                    size: 32,
                    values: (_u, splits) => splits.map(x => {
                        const d = new Date(x);
                        if(hoursRef.current > 24 && d.getHours() === 0 && d.getMinutes() === 0) return d.toLocaleDateString([], { weekday: "short", day: "numeric" });
                        return d.toLocaleTimeString([], d.getMinutes() === 0 ? { hour: "numeric" } : { hour: "numeric", minute: "2-digit" });
                    })
                },
                { ...AXIS, size: 36, splits: (u) => [3.9, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26].filter(x => x <= u.scales.y.max! && x >= u.scales.y.min!) }
            ],
            series: [
                {},
                {
                    stroke: rangeGradient,
                    width: 2,
                    spanGaps: false,
                    points: { show: (u) => u.data[0].length <= 80, size: 4, stroke: rangeGradient, fill: rangeGradient }
                }
            ],
            hooks: {
                drawClear: [
                    u => {
                        const ctx = u.ctx;
                        const top = u.valToPos(HIGH, "y", true);
                        const bottom = u.valToPos(LOW, "y", true);
                        ctx.save();
                        ctx.fillStyle = "rgba(52, 211, 153, 0.07)";
                        ctx.fillRect(u.bbox.left, top, u.bbox.width, bottom - top);
                        ctx.restore();
                    }
                ],
                setCursor: [showReadout]
            }
        }, withGaps(seriesRef.current), el);
        plotRef.current = u;

        // Let a horizontal drag scrub the chart on touch screens while vertical scroll still works
        const over = u.over;
        over.style.touchAction = "pan-y";
        const onTouch = (e : TouchEvent) => {
            const touch = e.touches[0];
            if(!touch) return;
            const rect = over.getBoundingClientRect();
            u.setCursor({ left: touch.clientX - rect.left, top: touch.clientY - rect.top });
        }
        const onTouchEnd = () => u.setCursor({ left: -10, top: -10 });
        over.addEventListener("touchstart", onTouch, { passive: true });
        over.addEventListener("touchmove", onTouch, { passive: true });
        over.addEventListener("touchend", onTouchEnd);

        const observer = new ResizeObserver(() => {
            if(el.clientWidth === 0 || el.clientHeight === 0) return;
            u.setSize({ width: el.clientWidth, height: el.clientHeight });
        });
        observer.observe(el);

        return () => {
            observer.disconnect();
            u.destroy();
            plotRef.current = undefined;
        }
    }, []);

    useEffect(() => {
        plotRef.current?.setData(withGaps(series));
    }, [series, hours]);

    return <div class="absolute inset-0">
        <div ref={readoutRef} class="pointer-events-none absolute right-2 top-1 z-10 rounded bg-zinc-900/80 px-2 py-0.5 text-sm tabular-nums opacity-0 transition-opacity"/>
        <div ref={containerRef} class="h-full w-full"/>
    </div>
}
