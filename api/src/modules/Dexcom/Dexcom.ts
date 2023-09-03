import { useRedis } from "@modules/Database/useRedis";

import { Dexcom, GlucoseReading } from "@tangerie/dexcom.js";

const PULL_EVERY_SECONDS = 60;

const dexcom = new Dexcom(process.env.DEXCOM_USERNAME as string, process.env.DEXCOM_PASSWORD as string);

export const useDexcom = () => dexcom.login().then(() => dexcom);


const onInterval = async () => {
    await dexcom.login();
    console.log("Pulling Dexcom Data");

    const redis = await useRedis();

    if(!await redis.exists("glucose:readings")) {
        await redis.json.set("glucose:readings", ".", (await dexcom.getGlucoseReadings()).reverse().map(x => x.toObject()));
        return;
    }

    const previous = await getLatestGlucose();

    
    const readings = await dexcom.getGlucoseReadings(10, 1);
    if(readings.length === 0) return;
    if(!previous || previous.date != readings[0].toObject().date) {
        console.log("New Reading: ", readings[0].toString());
        await redis.json.arrAppend("glucose:readings", ".", readings[0].toObject());
    }
}

const init = async () => {
    if(loop) clearInterval(loop);

    // console.log("Dexcom Init");
    await onInterval();
}

let loop : NodeJS.Timer | null = null;
export const StartDexcomLoop = () => init().then(() => loop = setInterval(onInterval, PULL_EVERY_SECONDS * 1000));


export const getLatestGlucose = async () => {
    const redis = await useRedis();

    const length = (await redis.json.arrLen("glucose:readings")) as number;
    if(length === 0) return undefined;
    return (await redis.json.get("glucose:readings", { path: `$[${length - 1}]`}) as ReturnType<GlucoseReading["toObject"]>[])[0];
}