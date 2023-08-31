import express from "express";
import { GlucoseReading, GlucoseTrend } from "@tangerie/dexcom.js"

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

export default TestRoutes;