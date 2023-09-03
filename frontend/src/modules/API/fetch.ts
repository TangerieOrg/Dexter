import { BASE_URL } from "@modules/Util/Query";
import { merge } from "lodash";
const API_ROOT: string = `${BASE_URL}api`;

export const getAPIUrl = (url: string) => `${API_ROOT}${url.startsWith("/") ? "" : "/"}${url}`;

export const RawFetchAPI = (path : string, init? : RequestInit) => fetch(getAPIUrl(path), merge<RequestInit, RequestInit>({
    headers: {
        "Content-Type": "application/json",
    },
    credentials: 'include'
}, init ?? {}));

export const FetchAPI = (...args : Parameters<typeof RawFetchAPI>) => RawFetchAPI(...args).catch(err => {
    console.error("[API ERROR]", ...args, err);
    throw new Error(err);
});

export const FetchAPIJSON = <R,>(...args : Parameters<typeof FetchAPI>) => FetchAPI(...args).then(r => r.json() as R);