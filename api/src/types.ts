import { Express } from "express";

export type BasicGetParams = Parameters<Express["get"]>[1];
export type BasicPostParams = Parameters<Express["post"]>[1];

export type BasicParams = BasicGetParams | BasicPostParams;

export type RequestParam<T extends BasicParams = BasicGetParams> = Parameters<T>[0];
export type ResponseParam<T extends BasicParams = BasicGetParams> = Parameters<T>[1];