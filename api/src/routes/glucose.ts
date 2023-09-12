import { RequiresAuthentication } from "@modules/Auth";
import { useRedis } from "@modules/Database/useRedis";
import { getLastGlucose, getLatestGlucose, useDexcom } from "@modules/Dexcom";
import express from "express";
import asyncHandler from "express-async-handler";

const GlucoseRoutes = express.Router();

// GlucoseRoutes.use(RequiresAuthentication);

GlucoseRoutes.get("/current", asyncHandler(async (req, res) => {
    res.json(await getLatestGlucose());
}));

GlucoseRoutes.get("/ten", asyncHandler(async (req, res) => {
    res.json(await getLastGlucose(10));
}));

GlucoseRoutes.get("/query", RequiresAuthentication, asyncHandler(async (req, res) => {
    const length = parseInt(req.query.length as string ?? "0");
    res.json(await getLastGlucose(Math.max(1, length)));
}));

export default GlucoseRoutes;
