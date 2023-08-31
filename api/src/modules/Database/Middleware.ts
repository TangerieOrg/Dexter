import { NextFunction, Request, Response } from "express";

import { createClient } from "redis";

export async function CreateDatabase() {
    const client = createClient({
        url: process.env.REDIS_URL
    });
    
    await client.connect();

    return client;
}

export async function DatabaseMiddleware(req : Request, res : Response, next : NextFunction) {
    const client = await CreateDatabase();

    req.redis = client;
    
    res.on("finish", () => {
        client.quit();
    });

    next();
}