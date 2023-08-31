import { pick } from "lodash";
import { useEffect, useMemo } from "preact/hooks";
import { useLocation } from "react-router-dom";

export function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

export function useQueryParameter(key : string, defaultValue : string) : string;
export function useQueryParameter(key : string, defaultValue?: string) {
    const q = useQuery();
    return useMemo(() => q.get(key) ?? defaultValue, [q]);
}

export function toQueryString(data : Record<string, any>) {
    const params = new URLSearchParams();
    for(const key in data) params.set(key, data[key])
    return params.toString();
}

export const BASE_URL = process.env.APP_BASE_URL ?? (process.env.NODE_ENV === "development" ? "/" : "/dexter");

export const getLocationParts = (pathname ?: string) => {
    if(pathname === undefined) pathname = window.location.pathname.slice(BASE_URL.length);
    if(pathname.at(0) === '/') pathname = pathname.slice(1)  // Remove leading '/'
    if(pathname.length === 0) return [];
    return pathname.split("/");
}

export const getObjectFromURL = (search = window.location.search) : Record<string, string> => {
    const params = new URLSearchParams(search);
    return Object.fromEntries(params.entries()) as Record<string, string>;
}

export const getFilteredObjectFromURL = <T extends object>(keys : (keyof T)[]) : Partial<T> => {
    const params = new URLSearchParams(window.location.search);
    const v = Object.fromEntries(params.entries()) as Partial<T>;
    return pick(v, keys);
}

export const useOnQueryChanged = (cb : (pathname : string, search : string) => any) => {
    const { pathname, search } = useLocation();

    useEffect(() => cb(pathname, search), [pathname, search]);
}