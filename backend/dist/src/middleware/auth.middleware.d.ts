import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            userId: string;
        }
    }
}
export declare const authMiddleware: (req: Request, _res: Response, next: NextFunction) => void;
