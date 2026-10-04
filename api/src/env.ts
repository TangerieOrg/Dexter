import { load } from "@std/dotenv";

export const IS_DEV = Deno.env.get("DENO_ENV") === "development";

// Later files override earlier ones, matching the old node loader
export async function loadEnv() {
    const files = [".env"];
    if(IS_DEV) files.push(".env.development");
    const dexcomEnvFile = Deno.env.get("DEXCOM_ENV_FILE");
    if(dexcomEnvFile) files.push(dexcomEnvFile);

    for(const file of files) {
        const vars = await load({ envPath: file, export: false }).catch(() => ({} as Record<string, string>));
        for(const key in vars) Deno.env.set(key, vars[key]);
    }
}
