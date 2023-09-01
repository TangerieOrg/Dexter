import { LoadEnv } from "@modules/Env";

LoadEnv();

import express from "express";
import cors from "cors";
import router from "./routes";
import cookieMiddleware from "cookie-parser";
import { StartDexcomLoop } from '@modules/Dexcom';
import { AuthenticatorMiddleware } from '@modules/Auth';


const app = express();

// Forward IP
app.set('trust proxy', true)

// CORS
app.use(cors())
app.options('*', cors());

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.use(cookieMiddleware(process.env.COOKIE_SECRET || "cookie_secret"));
app.use(AuthenticatorMiddleware);

// Disable cache
app.use((req, res, next) => {
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Expires", "0");

    const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
    const trackingDetails = req.userid ? `USER ${req.userid}` : `TRACK ${req.tracking}`;
    console.log(`[${ip} - ${trackingDetails}] ${req.url} (${JSON.stringify(req.body)})`);
    next();
})

// Routes
app.use(router);


const port = process.env.EXPRESS_PORT ?? 80;

app.listen(port, () => {
    console.log("Listening on port", port);
    StartDexcomLoop();
});