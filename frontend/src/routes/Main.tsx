import { FetchAPIJSON } from "@modules/API";
import { useEffect, useState } from "preact/hooks";
import { TrendArrow, GlucoseTrend } from "@tangerie/dexcom.js";

interface Reading {
    value: number,
    trend: GlucoseTrend,
    trendArrow: TrendArrow,
    date: number
}

const trendDescriptions : Partial<Record<GlucoseTrend, string>> = {
    DoubleUp: "+5",
    SingleUp: "+3.3 - 5",
    FortyFiveUp: "+1.7 - 3.3",
    Flat: "+/- 1.0",
    FortyFiveDown: "-1.7 - 3.3",
    SingleDown: "-3.3 - 5",
    DoubleDown: "-5",
}

function TrendDescription({ current } : { current : Reading } ) {
    if(!trendDescriptions[current.trend]) return <>{current.trend}</>
    return <>{current.trend} <span class="text-2xl">{trendDescriptions[current.trend]}</span></>
}

export default function MainRoute() {
    const [prev, setPrev] = useState<Reading>({
        value: 0,
        trend: "Flat",
        trendArrow: "?",
        date: Date.now()
    });

    const [current, setCurrent] = useState<Reading>({
        value: 0,
        trend: "Flat",
        trendArrow: "?",
        date: Date.now()
    });

    useEffect(() => {
        const update = () => FetchAPIJSON<Reading[]>("/glucose/query?length=2").then(readings => {
            setPrev(readings[0]);
            setCurrent(readings[1]);
        }).catch((err : Error) => {
            if(err.message === "Not Logged In") {
                if(process.env.NODE_ENV !== "development") {
                    window.location.href = `https://tangerie.xyz/oauth/login?redirect=/dexter`;
                }
            }
        });
        let interval = setInterval(update, 1000 * 60);
        update();
        return () => clearInterval(interval);
    }, []);

    return <div class="h-screen w-screen flex flex-col justify-center text-center">
        <div class="-mt-24 flex flex-col">
            <h1 class="text-9xl font-thin">{current.value}</h1>
            {/* <span class="font-light text-4xl">mmol/L</span> */}
            <span class="font-light text-3xl text-gray-600 dark:text-gray-300">{(current.value - prev.value) >= 0 && "+"}{(current.value - prev.value).toFixed(2)}</span>
            <span class="text-4xl mt-8 font-light"><TrendDescription current={current}/></span>
        </div>
    </div>
}