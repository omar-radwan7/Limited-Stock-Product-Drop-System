import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(message: string, statusCode: number, code: string);
}
export declare const errorHandler: (err: unknown, req: Request, res: Response, _next: NextFunction) => void;
