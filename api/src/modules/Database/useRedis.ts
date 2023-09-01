import { createClient } from "redis";

const client = createClient({
    url: process.env.REDIS_URL
});

client.on("error", err => console.error("[REDIS ERR]", err));

export async function useRedis() {
    if(!client.isOpen || !client.isReady) await client.connect(); 
    return client;
}