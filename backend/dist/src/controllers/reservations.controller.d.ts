import { Request, Response, NextFunction } from 'express';
export declare const reserveProduct: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const checkout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const cancelReservation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getActiveReservation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
