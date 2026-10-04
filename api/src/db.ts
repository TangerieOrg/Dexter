import { openDbHandler } from "@tangerie/utils/sqlite";
import { Reading } from "./types.ts";

export function openDatabase(path : string) {
    const db = openDbHandler({ path, readonly: false });
    // Dates are epoch ms, without this @db/sqlite truncates them to 32 bit
    db.int64 = true;

    db.exec(`--sql
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA busy_timeout = 5000;

        CREATE TABLE IF NOT EXISTS readings (
            date INTEGER PRIMARY KEY,
            mg_dl INTEGER NOT NULL,
            mmol REAL NOT NULL,
            trend TEXT NOT NULL
        ) WITHOUT ROWID;

        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    const insertStmt = db.prepare(`--sql
        INSERT OR IGNORE INTO readings (date, mg_dl, mmol, trend) VALUES (?, ?, ?, ?)
    `);
    const latestStmt = db.prepare(`--sql
        SELECT date, mg_dl, mmol, trend FROM readings ORDER BY date DESC LIMIT 1
    `);
    const lastNStmt = db.prepare(`--sql
        SELECT * FROM (SELECT date, mg_dl, mmol, trend FROM readings ORDER BY date DESC LIMIT ?) ORDER BY date ASC
    `);
    const rangeStmt = db.prepare(`--sql
        SELECT date, mmol FROM readings WHERE date >= ? AND date <= ? ORDER BY date ASC
    `);
    const statsStmt = db.prepare(`--sql
        SELECT COUNT(*) AS count, MIN(date) AS min, MAX(date) AS max FROM readings
    `);
    const getMetaStmt = db.prepare(`--sql
        SELECT value FROM meta WHERE key = ?
    `);
    const setMetaStmt = db.prepare(`--sql
        INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    // Returns the number of rows that were actually new
    const insertMany = db.transaction((readings : Reading[]) => {
        let added = 0;
        for(const x of readings) {
            added += insertStmt.run(x.date, x.mg_dl, x.mmol, x.trend);
        }
        return added;
    });

    return {
        insertMany: (readings : Reading[]) => insertMany(readings) as number,
        latest: () => latestStmt.get<Reading>(),
        lastN: (n : number) => lastNStmt.all<Reading>(n),
        range: (from : number, to : number) => rangeStmt.all<Pick<Reading, "date" | "mmol">>(from, to),
        stats: () => statsStmt.get<{ count: number, min: number | null, max: number | null }>()!,
        getMeta: (key : string) => getMetaStmt.get<{ value: string }>(key)?.value,
        setMeta: (key : string, value : string) => { setMetaStmt.run(key, value) },
        close: () => {
            for(const stmt of [insertStmt, latestStmt, lastNStmt, rangeStmt, statsStmt, getMetaStmt, setMetaStmt]) stmt.finalize();
            db.close();
        }
    }
}

export type DexterDatabase = ReturnType<typeof openDatabase>;
