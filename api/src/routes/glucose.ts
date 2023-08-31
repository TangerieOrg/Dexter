import { RequiresAuthentication } from "@modules/Auth";
import { useDexcom } from "@modules/Dexcom";
import express from "express";
import asyncHandler from "express-async-handler";

const GlucoseRoutes = express.Router();

GlucoseRoutes.get("/current", RequiresAuthentication, asyncHandler(async (req, res) => {
    const dexcom = await useDexcom();
    res.json((await dexcom.getGlucoseReadings(undefined, 1))[0].toObject());
}));

export default GlucoseRoutes;