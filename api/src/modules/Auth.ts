import { NextFunction, Request, Response } from "express";
import * as Authenticator from "@tangerie/authenticator-api";
import asyncHandler from "express-async-handler";

Authenticator.configure({
    url: process.env.AUTHENTICATOR_URL,
    debug: process.env.NODE_ENV === "development"
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