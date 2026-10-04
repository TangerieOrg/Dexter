import { createClient } from "redis";
import { DexterDatabase } from "./db.ts";
import { ApiReading, mmolToMg, Reading, TRENDS } from "./types.ts";

const REDIS_KEY = "glucose:readings";
export const IMPORTED_META_KEY = "redis_imported";

export function convertRedisReadings(raw : unknown) : Reading[] {
    if(!Array.isArray(raw)) throw new Error("Redis value is not an array");

    return (raw as ApiReading[]).map((x, i) => {
        if(typeof x?.value !== "number" || typeof x?.date !== "number" || !TRENDS.includes(x?.trend)) {
            throw new Error(`Invalid reading at index ${i}: ${JSON.stringify(x)}`);
        }
        return {
            date: x.date,
            mg_dl: mmolToMg(x.value),
            mmol: x.value,
            trend: x.trend
        }
    });
}

// Inserts then checks every source reading is present in sqlite
export function importReadings(db : DexterDatabase, readings : Reading[]) {
    const added = db.insertMany(readings);

    const dates = new Set(readings.map(x => x.date));
    let min = Infinity, max = -Infinity;
    for(const d of dates) {
        if(d < min) min = d;
        if(d > max) max = d;
    }

    const missing = dates.size === 0 ? 0 : dates.size - db.range(min, max).filter(x => dates.has(x.date)).length;
    if(missing !== 0) throw new Error(`Import verification failed, ${missing} readings missing`);

    return { source: readings.length, unique: dates.size, added, min, max };
}

export async function migrateFromRedis(db : DexterDatabase, url : string) {
    const done = db.getMeta(IMPORTED_META_KEY);
    if(done) return console.log("[Migrate] Redis already imported", done);

    const client = createClient({ url, socket: { connectTimeout: 5000, reconnectStrategy: false } });
    client.on("error", () => {});

    try {
        await client.connect();
    } catch(err) {
        return console.error("[Migrate] Could not connect to redis, skipping import", err);
    }

    try {
        const raw = await client.sendCommand(["JSON.GET", REDIS_KEY]) as string | null;
        if(raw == null) {
            console.log("[Migrate] No redis data found");
            db.setMeta(IMPORTED_META_KEY, JSON.stringify({ at: new Date().toISOString(), source: 0 }));
            return;
        }

        const result = importReadings(db, convertRedisReadings(JSON.parse(raw)));
        const summary = {
            at: new Date().toISOString(),
            ...result,
            min: new Date(result.min).toISOString(),
            max: new Date(result.max).toISOString(),
            total: db.stats().count
        };
        db.setMeta(IMPORTED_META_KEY, JSON.stringify(summary));
        console.log("[Migrate] Imported redis readings", summary);
    } catch(err) {
        console.error("[Migrate] REDIS IMPORT FAILED, will retry on next start", err);
    } finally {
        await client.quit().catch(() => {});
    }
}
