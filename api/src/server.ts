import { DexterDatabase } from "./db.ts";
import { toApi } from "./types.ts";

const MAX_QUERY_LENGTH = 2016;
const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

const BASE_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Surrogate-Control": "no-store",
    "Expires": "0"
};

const json = (body : unknown, status = 200, headers : HeadersInit = {}) => new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, "Content-Type": "application/json", ...headers }
});

const error = (status : number, message : string) => json({ error: message }, status);

export const parseLength = (s : string | null) => {
    const n = parseInt(s ?? "");
    return Number.isNaN(n) ? 1 : Math.min(MAX_QUERY_LENGTH, Math.max(1, n));
}

const parseTime = (s : string | null) => {
    if(s == null || s === "") return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
}

export function createHandler(db : DexterDatabase) {
    const routes : Array<[URLPattern, (req : Request, url : URL) => Response]> = [
        [new URLPattern({ pathname: "/glucose/current" }), () => {
            const latest = db.latest();
            if(!latest) return error(404, "No readings");
            return json(toApi(latest));
        }],
        [new URLPattern({ pathname: "/glucose/ten" }), () => json(db.lastN(10).map(toApi))],
        [new URLPattern({ pathname: "/glucose/query" }), (_, url) => json(db.lastN(parseLength(url.searchParams.get("length"))).map(toApi))],
        [new URLPattern({ pathname: "/glucose/range" }), (req, url) => {
            const to = parseTime(url.searchParams.get("to")) ?? Date.now();
            const from = parseTime(url.searchParams.get("from")) ?? to - 24 * 60 * 60 * 1000;
            if(Number.isNaN(from) || Number.isNaN(to)) return error(400, "Invalid range");
            if(to < from) return error(400, "Invalid range");
            if(to - from > MAX_RANGE_MS) return error(400, "Range too large");

            const rows = db.range(from, to);
            const etag = `W/"${rows.length}-${rows.at(-1)?.date ?? 0}-${rows[0]?.date ?? 0}"`;
            const headers = { "Cache-Control": "no-cache", "ETag": etag };
            if(req.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers: { ...BASE_HEADERS, ...headers } });

            return json({ t: rows.map(x => x.date), v: rows.map(x => x.mmol) }, 200, headers);
        }],
        [new URLPattern({ pathname: "/health" }), () => {
            const stats = db.stats();
            return json({ ok: true, count: stats.count, first: stats.min, latest: stats.max });
        }]
    ];

    return (req : Request) : Response => {
        const url = new URL(req.url);
        if(req.method === "OPTIONS") return new Response(null, { status: 204, headers: BASE_HEADERS });
        if(req.method !== "GET" && req.method !== "HEAD") return error(405, "Method not allowed");

        // Tolerate trailing slashes like express did
        const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
        const route = routes.find(([pattern]) => pattern.test({ pathname: path }));
        if(!route) return error(404, "Not found");

        try {
            return route[1](req, url);
        } catch(err) {
            console.error(err);
            return error(500, "Internal error");
        }
    }
}
