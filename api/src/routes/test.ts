import express from "express";
import { GlucoseReading, GlucoseTrend } from "@tangerie/dexcom.js"
import * as Authenticator from "@tangerie/authenticator-api";
import asyncHandler from "express-async-handler";
import { isAuthenticated } from "@modules/Auth";

const TestRoutes = express.Router();

TestRoutes.get('/', (req, res) => {
    const testReadings : GlucoseReading[] = [];
    const currentDate = Date.now();
    
    for(let i = 0; i < 280; i++) {
        testReadings.push(new GlucoseReading({
            DT: "",
            ST: "",
            WT: `Date(${currentDate - 1000 * 60 * i * 5})`,
            Trend: Object.values(GlucoseTrend)[Math.floor(Math.random() * Object.values(GlucoseTrend).length)],
            Value: Math.random() * 16 + 4
        }));
    }

    res.json(testReadings.map(x => x.toObject()));
});


TestRoutes.get("/auth", asyncHandler(async (req, res) => {
    res.json([req.userid , await isAuthenticated(req.userid )]);
}));

export default TestRoutes;