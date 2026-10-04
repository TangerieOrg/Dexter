import { GlucoseTrend, mgToMmol, Reading, TRENDS } from "./types.ts";

const BASE_URL = "https://shareous1.dexcom.com/ShareWebServices/Services";
const APPLICATION_ID = "d89443d2-327c-4a6f-89e5-496bbb0317db";
const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
const SESSION_ERRORS = ["SessionIdNotFound", "SessionNotValid"];
const TIMEOUT_MS = 10_000;

export interface GlucoseReadingJSON {
    WT: string,
    ST: string,
    DT: string,
    Value: number,
    Trend: GlucoseTrend | number
}

// "Date(1693456789000)" or "Date(1693456789000+1000)"
export const parseDexcomDate = (s : string) => parseInt(s.slice(5, -1));

export const parseReading = (json : GlucoseReadingJSON) : Reading => ({
    date: parseDexcomDate(json.WT),
    mg_dl: json.Value,
    mmol: mgToMmol(json.Value),
    trend: typeof json.Trend === "number" ? (TRENDS[json.Trend] ?? "NotComputable") : json.Trend
});

export class Dexcom {
    private sessionId : string | undefined;

    constructor(private username : string, private password : string) {}

    async #post<T>(path : string, body : unknown) : Promise<T> {
        const res = await fetch(`${BASE_URL}/${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
        const text = await res.text();
        if(!res.ok) {
            const err = safeParse(text);
            throw Object.assign(new Error(err.Message ?? `Dexcom ${res.status}`), { code: err.Code ?? String(res.status) });
        }
        return (text ? JSON.parse(text) : undefined) as T;
    }

    async #login() {
        const accountId = await this.#post<string>("General/AuthenticatePublisherAccount", {
            accountName: this.username,
            password: this.password,
            applicationId: APPLICATION_ID
        });
        if(!accountId || accountId === EMPTY_UUID) throw new Error("Invalid Dexcom Credentials");

        const sessionId = await this.#post<string>("General/LoginPublisherAccountById", {
            accountId,
            password: this.password,
            applicationId: APPLICATION_ID
        });
        if(!sessionId || sessionId === EMPTY_UUID) throw new Error("Invalid Dexcom Session");

        this.sessionId = sessionId;
        console.log("[Dexcom] Logged in");
    }

    // Newest first, same as the share API
    public async getReadings(minutes = 1440, maxCount = 288) : Promise<Reading[]> {
        if(!this.sessionId) await this.#login();

        const read = () => this.#post<GlucoseReadingJSON[]>(
            `Publisher/ReadPublisherLatestGlucoseValues?sessionId=${this.sessionId}&minutes=${minutes}&maxCount=${maxCount}`,
            {}
        );

        let readings : GlucoseReadingJSON[];
        try {
            readings = await read();
        } catch(err) {
            if(!SESSION_ERRORS.includes((err as { code?: string }).code ?? "")) throw err;
            this.sessionId = undefined;
            await this.#login();
            readings = await read();
        }

        return (readings ?? []).map(parseReading);
    }
}

function safeParse(text : string) : Record<string, string> {
    try {
        return JSON.parse(text) ?? {};
    } catch {
        return {};
    }
}
