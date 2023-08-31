import { getLocationParts, getObjectFromURL, useOnQueryChanged } from "./Util/Query"
import { createStore, createUseStore } from "@tangerie/better-global-store"
import { pick } from "lodash";

interface State {
    path: string[],
    query: Record<string, string>
}

const initial : State = {
    path: getLocationParts(),
    query: getObjectFromURL()
}

export const URLStore = createStore({
    state: initial,
    actions: {
        update(state, pathname : string, query : string) {
            state.path = getLocationParts(pathname);
            state.query = getObjectFromURL(query);
        }
    }
});

export const useURLStore = createUseStore(URLStore);
export const useURLStoreUpdater = () => useOnQueryChanged((pathname, query) => {
    URLStore.actions.update(pathname, query);
})
export const selectPath = (state : State) => state.path;
export const selectQuery = (state : State) => state.query;
export const selectQueryParameters = <T extends {[K in keyof T]: string}>(keys : (keyof T)[]) => (state : State) => pick(state.query, keys) as {
    [K in keyof T]?: string
};