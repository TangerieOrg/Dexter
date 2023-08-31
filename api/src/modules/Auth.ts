import { randomBytes } from "crypto";
import { NextFunction, Request, Response } from "express";
import * as Authenticator from "@tangerie/authenticator-api";
import asyncHandler from "express-async-handler";

Authenticator.configure({
    url: process.env.AUTHENTICATOR_URL,
    // debug: process.env.NODE_ENV === "development"
})

export const isAuthenticated = async (userId? : string) => {
    if(!userId) return false;
    return await Authenticator.validate(userId).then(d => d.valid).catch(() => false);
}

export const isAuthenticatedMiddleware = async (req : Request, res : Response, next : NextFunction) => {
    req.isAuthenticated = await isAuthenticated(req.userid);
    next();
};

export const RequiresAuthentication = asyncHandler(async (req : Request, res : Response, next : NextFunction) => {
    if(!req.userid) throw new Error("Not Logged In");
    await Authenticator.validate(req.userid!).catch(() => { throw new Error("Invalid UserID") });
    next();
});

async function getCookie(req : Request, res : Response) {
    let cookie = req.signedCookies["tracker"];
    if(!cookie) {
        cookie = randomBytes(20).toString("hex");
        res.cookie("tracker", cookie, {
            signed: true,
            expires: new Date(9999, 1),
            sameSite: 'none',
            path: process.env.NODE_ENV === "development" ? "/" : "/codex"
        });
    }

    return cookie as string;
}

export const AuthenticatorMiddleware = async (req : Request, res : Response, next : NextFunction) => {
    req.tracking = await getCookie(req, res);
    req.userid = req.signedCookies["userid"] as string | undefined;
    next();
}