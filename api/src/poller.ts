import { DexterDatabase } from "./db.ts";
import { Dexcom } from "./dexcom.ts";

const PULL_EVERY_MS = 60_000;
const MAX_MINUTES = 1440;
// Dexcom backfills readings after signal loss, so periodically re-pull the full day to fill holes
const FULL_PULL_EVERY = 60;

// Enough history to cover the gap since the last stored reading (+5 min for late uploads)
export function getPullWindow(lastDate : number | undefined, now = Date.now()) {
    const minutes = lastDate == null ?
        MAX_MINUTES :
        Math.min(MAX_MINUTES, Math.max(10, Math.ceil((now - lastDate) / 60_000) + 5));
    return { minutes, maxCount: Math.min(288, Math.ceil(minutes / 5) + 1) };
}

export async function poll(db : DexterDatabase, dexcom : Dexcom, full = false) {
    const { minutes, maxCount } = getPullWindow(full ? undefined : db.latest()?.date);
    const readings = await dexcom.getReadings(minutes, maxCount);
    const added = db.insertMany(readings);
    if(added > 0) {
        const latest = db.latest()!;
        console.log(`[Dexcom] ${added} new reading${added === 1 ? "" : "s"}, latest ${latest.mmol} ${latest.trend} @ ${new Date(latest.date).toISOString()}`);
    }
    return added;
}

export function startPolling(db : DexterDatabase, dexcom : Dexcom) {
    let timeout : ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let i = 0;

    const loop = async () => {
        try {
            await poll(db, dexcom, i++ % FULL_PULL_EVERY === 0);
        } catch(err) {
            console.error("[Dexcom] Poll failed", err);
        }
        if(!stopped) timeout = setTimeout(loop, PULL_EVERY_MS);
    }
    loop();

    return () => {
        stopped = true;
        clearTimeout(timeout);
    }
}
