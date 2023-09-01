import dotenv from 'dotenv';
import path from "path";

export const LoadEnv = () => {
    const cwd = process.cwd();

    dotenv.config({
        path: path.join(cwd, ".env")
    });

    if(process.env.NODE_ENV === 'development') dotenv.config({
        path: path.join(cwd, ".env.development"),
        override: true
    });

    if(process.env.DEXCOM_ENV_FILE) dotenv.config({
        path: process.env.DEXCOM_ENV_FILE,
        override: true
    });
}