// import { CreateDatabase } from "@modules/Database/Middleware";

const PULL_EVERY_SECONDS = 60;

const onInterval = async () => {
    console.log("Pulling Dexcom Data");

    /*const client = await CreateDatabase();

    // Do Database stuff

    await client.quit();*/
}

const init = async () => {
    // console.log("Dexcom Init");
    await onInterval();
}

export const StartDexcomLoop = () => init().then(() => setInterval(onInterval, PULL_EVERY_SECONDS * 1000));