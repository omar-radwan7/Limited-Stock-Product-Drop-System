import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { ProductsQuerySchema } from '../validators/reservations.validator';
import prisma, { dbConnected } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Validate + parse + sanitize query params — prevents sort injection
    const { page, limit, sortBy, order } = ProductsQuerySchema.parse(req.query);

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: order } as Prisma.ProductOrderByWithRelationInput,
      }),
      prisma.product.count(),
    ]);

    // Debugging: Verify imageUrls are present
    console.log('SYNC_DEBUG: Sending products with images:', products.map(p => ({ n: p.name, img: p.imageUrl })));

    res.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: unknown) {
    next(err);
  }
};

export const getProductById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rawId: string | string[] | undefined = req.params['id'];
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      throw new AppError('Product ID is required', 400, 'MISSING_PRODUCT_ID');
    }

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    res.json(product);
  } catch (err: unknown) {
    next(err);
  }
};

export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  // Basic health check - always returns ok for the server itself
  // Database status is reported separately
  let dbStatus = 'unknown';

  if (dbConnected) {
    dbStatus = 'connected';
  } else {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }
  }

  res.status(dbStatus === 'connected' ? 200 : 503).json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
};

export const getMetrics = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalReservations, activeReservations, totalOrders, expiredToday] = await Promise.all([
      prisma.reservation.count(),
      prisma.reservation.count({
        where: { status: 'PENDING', expiresAt: { gt: new Date() } },
      }),
      prisma.order.count(),
      prisma.reservation.count({
        where: { status: 'EXPIRED', createdAt: { gte: startOfToday } },
      }),
    ]);

    res.json({ totalReservations, activeReservations, expiredToday, totalOrders });
  } catch (err: unknown) {
    next(err);
  }
};
