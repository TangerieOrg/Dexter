declare namespace Express {
    export interface Request {
        tracking : string;
        userid?: string;
        isAuthenticated?: boolean;
    }
}