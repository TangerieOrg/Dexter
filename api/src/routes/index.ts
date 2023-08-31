import express from "express";
import TestRoutes from "./test";
import { Request, Response, NextFunction } from "express";
import GlucoseRoutes from "./glucose";

const router = express.Router();

const routers : Record<string, express.Router> = {
    "/glucose": GlucoseRoutes,
};

if(process.env.NODE_ENV === "development") {
    routers['/test'] = TestRoutes;
}

for(const key of Object.keys(routers)) {
    router.use(key, routers[key])
}

router.use((err : any, req : Request, res : Response, next : NextFunction) => {
    if(!res.headersSent) {
        console.log(`[ERR] '${err.message}'`);
        res.status(400);
        res.json({ error: err.message });
    }
})

export default router;