import { FetchAPIJSON } from "@modules/API";
import { useEffect, useState } from "preact/hooks"

interface Reading {
    value: number,
    trend: string,
    trendArrow: string,
    date: number
}

export default function MainRoute() {
    const [current, setCurrent] = useState<Reading>({
        value: 0,
        trend: "Flat",
        trendArrow: "?",
        date: Date.now()
    });

    useEffect(() => {
        const update = () => FetchAPIJSON<Reading>("/glucose/current").then(setCurrent);
        let interval = setInterval(update, 1000 * 60);
        update();
        return () => clearInterval(interval);
    }, []);

    return <div class="h-screen w-screen flex flex-col justify-center text-center">
        <div class="-mt-24">
            <h1 class="text-9xl font-thin">{current.value}</h1>
            <span class="font-light text-4xl">mmol/L</span>
        </div>
        {/* <h2 class="mt-8 text-xl italic">Steady Down</h2> */}
    </div>
}