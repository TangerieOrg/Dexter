import { loadEnv } from "./env.ts";
import { openDatabase } from "./db.ts";
import { Dexcom } from "./dexcom.ts";
import { migrateFromRedis } from "./migrate.ts";
import { startPolling } from "./poller.ts";
import { createHandler } from "./server.ts";

await loadEnv();

const DB_PATH = Deno.env.get("DB_PATH") ?? "./data/dexter.db";
const PORT = parseInt(Deno.env.get("PORT") ?? "80");
const REDIS_URL = Deno.env.get("REDIS_URL");
const DEXCOM_USERNAME = Deno.env.get("DEXCOM_USERNAME");
const DEXCOM_PASSWORD = Deno.env.get("DEXCOM_PASSWORD");

const dir = DB_PATH.split("/").slice(0, -1).join("/");
if(dir) await Deno.mkdir(dir, { recursive: true });

const db = openDatabase(DB_PATH);
console.log("[DB] Opened", DB_PATH, db.stats());

if(REDIS_URL) await migrateFromRedis(db, REDIS_URL);

let stopPolling = () => {};
if(DEXCOM_USERNAME && DEXCOM_PASSWORD) {
    stopPolling = startPolling(db, new Dexcom(DEXCOM_USERNAME, DEXCOM_PASSWORD));
} else {
    console.error("[Dexcom] DEXCOM_USERNAME/DEXCOM_PASSWORD not set, not polling");
}

const handler = createHandler(db);
const server = Deno.serve({ port: PORT, hostname: "0.0.0.0" }, (req, info) => {
    const res = handler(req);
    const ip = req.headers.get("x-real-ip") ?? (info.remoteAddr as Deno.NetAddr).hostname;
    console.log(`[${ip}] ${req.method} ${new URL(req.url).pathname} ${res.status}`);
    return res;
});

const shutdown = async () => {
    stopPolling();
    await server.shutdown();
    db.close();
    Deno.exit(0);
}
Deno.addSignalListener("SIGTERM", shutdown);
Deno.addSignalListener("SIGINT", shutdown);
