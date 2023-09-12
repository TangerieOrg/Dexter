import { FetchAPIJSON } from "@modules/API";
import { useEffect, useState } from "preact/hooks"

interface Reading {
    value: number,
    trend: string,
    trendArrow: string,
    date: number
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
                window.location.href = "https://tangerie.xyz/oauth/login?redirect=/dexter";
            }
        });
        let interval = setInterval(update, 1000 * 60);
        update();
        return () => clearInterval(interval);
    }, []);

    return <div class="h-screen w-screen flex flex-col justify-center text-center">
        <div class="-mt-24 flex flex-col">
            <h1 class="text-9xl font-thin">{current.value}</h1>
            <span class="font-light text-4xl">mmol/L</span>
            <span class="text-4xl mt-8 font-light">{current.trend} ({(current.value - prev.value) >= 0 && "+"}{(current.value - prev.value).toFixed(2)})</span>
        </div>
    </div>
}