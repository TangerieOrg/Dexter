import { DatabaseSync } from "node:sqlite";
import { Reading } from "./types.ts";

export function openDatabase(path : string) {
    const db = new DatabaseSync(path);

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
    const insertMany = (readings : Reading[]) => {
        let added = 0;
        db.exec("BEGIN");
        try {
            for(const x of readings) {
                added += Number(insertStmt.run(x.date, x.mg_dl, x.mmol, x.trend).changes);
            }
            db.exec("COMMIT");
        } catch(err) {
            db.exec("ROLLBACK");
            throw err;
        }
        return added;
    }

    return {
        insertMany,
        latest: () => latestStmt.get() as Reading | undefined,
        lastN: (n : number) => lastNStmt.all(n) as unknown as Reading[],
        range: (from : number, to : number) => rangeStmt.all(from, to) as unknown as Pick<Reading, "date" | "mmol">[],
        stats: () => statsStmt.get() as { count: number, min: number | null, max: number | null },
        getMeta: (key : string) => (getMetaStmt.get(key) as { value: string } | undefined)?.value,
        setMeta: (key : string, value : string) => { setMetaStmt.run(key, value) },
        close: () => {
            db.exec("PRAGMA analysis_limit=400; PRAGMA optimize;");
            db.close();
        }
    }
}

export type DexterDatabase = ReturnType<typeof openDatabase>;
