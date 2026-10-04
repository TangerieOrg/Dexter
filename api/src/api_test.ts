import { assertEquals } from "@std/assert";
import { openDatabase } from "./db.ts";
import { parseReading } from "./dexcom.ts";
import { getPullWindow } from "./poller.ts";
import { createHandler, parseLength } from "./server.ts";
import { mgToMmol, Reading } from "./types.ts";

const T0 = 1_760_605_569_000;
const FIVE_MIN = 5 * 60 * 1000;

const reading = (i : number, mg = 100 + i) : Reading => ({ date: T0 + i * FIVE_MIN, mg_dl: mg, mmol: mgToMmol(mg), trend: "Flat" });

const get = async (handler : ReturnType<typeof createHandler>, path : string, headers : HeadersInit = {}) => {
    const res = handler(new Request(`http://localhost${path}`, { headers }));
    return { status: res.status, headers: res.headers, body: res.status === 304 ? null : await res.json() };
}

Deno.test("insertMany dedupes and keeps order", () => {
    const db = openDatabase(":memory:");
    assertEquals(db.insertMany([reading(2), reading(0), reading(1)]), 3);
    assertEquals(db.insertMany([reading(1), reading(2), reading(3)]), 1);
    assertEquals(db.lastN(10).map(x => x.date), [0, 1, 2, 3].map(x => T0 + x * FIVE_MIN));
    assertEquals(db.latest()?.date, T0 + 3 * FIVE_MIN);
    db.close();
});

Deno.test("mmol round trips through mg/dL", () => {
    for(let mg = 39; mg < 402; mg++) assertEquals(Math.round(mgToMmol(mg) / 0.0555), mg);
});

Deno.test("parseReading", () => {
    assertEquals(parseReading({ WT: "Date(1693456789000)", ST: "", DT: "Date(1693456789000+1000)", Value: 110, Trend: "SingleUp" }), {
        date: 1693456789000, mg_dl: 110, mmol: 6.11, trend: "SingleUp"
    });
    assertEquals(parseReading({ WT: "Date(1)", ST: "", DT: "", Value: 110, Trend: 4 }).trend, "Flat");
});

Deno.test("pull window", () => {
    assertEquals(getPullWindow(undefined), { minutes: 1440, maxCount: 288 });
    assertEquals(getPullWindow(T0, T0 + FIVE_MIN), { minutes: 10, maxCount: 3 });
    assertEquals(getPullWindow(T0, T0 + 60 * 60 * 1000), { minutes: 65, maxCount: 14 });
    assertEquals(getPullWindow(T0, T0 + 3 * 24 * 60 * 60 * 1000), { minutes: 1440, maxCount: 288 });
});

Deno.test("query length parsing", () => {
    assertEquals(parseLength(null), 1);
    assertEquals(parseLength("abc"), 1);
    assertEquals(parseLength("-5"), 1);
    assertEquals(parseLength("2"), 2);
    assertEquals(parseLength("100000000"), 2016);
});

Deno.test("routes", async () => {
    const db = openDatabase(":memory:");
    const handler = createHandler(db);

    assertEquals((await get(handler, "/glucose/current")).status, 404);
    assertEquals((await get(handler, "/glucose/ten")).body, []);

    db.insertMany(Array.from({ length: 20 }, (_, i) => reading(i)));

    const current = await get(handler, "/glucose/current/");
    assertEquals(current.body, { value: mgToMmol(119), trend: "Flat", trendArrow: "→", date: T0 + 19 * FIVE_MIN });
    assertEquals((await get(handler, "/glucose/ten")).body.length, 10);
    assertEquals((await get(handler, "/glucose/query?length=2")).body.map((x : { date: number }) => x.date), [T0 + 18 * FIVE_MIN, T0 + 19 * FIVE_MIN]);
    assertEquals((await get(handler, "/glucose/query?length=abc")).body.length, 1);

    const range = await get(handler, `/glucose/range?from=${T0 + 15 * FIVE_MIN}&to=${T0 + 17 * FIVE_MIN}`);
    assertEquals(range.body, { t: [15, 16, 17].map(x => T0 + x * FIVE_MIN), v: [115, 116, 117].map(mgToMmol) });

    const cached = await get(handler, `/glucose/range?from=${T0 + 15 * FIVE_MIN}&to=${T0 + 17 * FIVE_MIN}`, { "If-None-Match": range.headers.get("ETag")! });
    assertEquals(cached.status, 304);

    assertEquals((await get(handler, "/glucose/range?from=abc")).status, 400);
    assertEquals((await get(handler, "/glucose/range?from=0&to=99999999999")).status, 400);
    assertEquals((await get(handler, "/nope")).status, 404);
    assertEquals((await get(handler, "/health")).body.count, 20);
    db.close();
});
