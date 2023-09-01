import { CreateDatabase } from "@modules/Database/Middleware";

import { Dexcom } from "@tangerie/dexcom.js";

const PULL_EVERY_SECONDS = 60;

const dexcom = new Dexcom(process.env.DEXCOM_USERNAME as string, process.env.DEXCOM_PASSWORD as string);

export const useDexcom = () => dexcom.login().then(() => dexcom);

const onInterval = async () => {
    await dexcom.login();
    console.log("Pulling Dexcom Data");

    const redis = await CreateDatabase();

    const readings = await dexcom.getGlucoseReadings(10, 1);
    console.log(readings[0].toString());

    await redis.quit();
}

const init = async () => {
    if(loop) clearInterval(loop);
    // console.log("Dexcom Init");
    await onInterval();
}

let loop : NodeJS.Timer | null = null;
export const StartDexcomLoop = () => init().then(() => loop = setInterval(onInterval, PULL_EVERY_SECONDS * 1000))