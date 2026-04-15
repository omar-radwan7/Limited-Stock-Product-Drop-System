import { Request, Response, NextFunction } from 'express';
export declare const getProducts: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getProductById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getHealth: (_req: Request, res: Response) => Promise<void>;
export declare const getMetrics: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
