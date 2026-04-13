import { Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { ReserveSchema, CheckoutSchema } from '../validators/reservations.validator';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';

// Typed row returned by SELECT FOR UPDATE raw query
type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: Date;
};

export const reserveProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { productId, quantity } = ReserveSchema.parse(req.body);
    // userId is set by authMiddleware — guaranteed to exist at this point
    const userId = req.userId;

    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the product row for the duration of this transaction.
        // SELECT FOR UPDATE prevents any concurrent transaction from reading
        // stale stock until this one commits or rolls back.
        const products = await tx.$queryRaw<ProductRow[]>`
          SELECT * FROM "Product" WHERE id = ${productId} FOR UPDATE
        `;

        if (products.length === 0) {
          throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
        }

        // Safe: Prisma returns typed rows via the generic parameter
        const product = products[0] as ProductRow;

        const existingReservation = await tx.reservation.findFirst({
          where: {
            userId,
            productId,
            status: 'PENDING',
            expiresAt: { gt: new Date() },
          },
        });

        if (existingReservation) {
          throw new AppError(
            'You already have a pending reservation for this product',
            409,
            'DUPLICATE_RESERVATION',
          );
        }

        // Guard against negative stock — absolute safety check
        if (product.stock < quantity) {
          throw new AppError(
            'Insufficient stock available',
            409,
            'INSUFFICIENT_STOCK',
          );
        }

        // Deduct stock atomically inside this locked transaction
        await tx.product.update({
          where: { id: productId },
          data: { stock: { decrement: quantity } },
        });

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        const reservation = await tx.reservation.create({
          data: {
            userId,
            productId,
            quantity,
            status: 'PENDING',
            expiresAt,
          },
        });

        // Audit log: negative changeAmount = stock decrease
        await tx.inventoryLog.create({
          data: {
            productId,
            reservationId: reservation.id,
            changeAmount: -quantity,
            reason: 'RESERVED',
          },
        });

        return { reservationId: reservation.id, expiresAt: reservation.expiresAt };
      },
      {
        // Serializable prevents phantom reads and write skew — critical for inventory
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        action: 'RESERVE_SUCCESS',
        userId,
        productId,
        quantity,
        reservationId: result.reservationId,
      }),
    );

    res.status(201).json(result);
  } catch (err: unknown) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        action: 'RESERVE_FAILURE',
        error: err instanceof Error ? err.message : 'unknown',
        code: err instanceof AppError ? err.code : 'UNKNOWN',
      }),
    );
    next(err);
  }
};

export const checkout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { reservationId } = CheckoutSchema.parse(req.body);
    const userId = req.userId;

    const result = await prisma.$transaction(
      async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
          include: { product: true },
        });

        if (!reservation) {
          throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
        }

        // Ensure the reservation belongs to the authenticated user
        if (reservation.userId !== userId) {
          throw new AppError('You do not own this reservation', 403, 'FORBIDDEN');
        }

        if (reservation.status !== 'PENDING') {
          throw new AppError(
            `Reservation is already ${reservation.status}`,
            409,
            'INVALID_RESERVATION_STATUS',
          );
        }

        if (reservation.expiresAt < new Date()) {
          throw new AppError('Reservation has expired', 410, 'RESERVATION_EXPIRED');
        }

        const totalAmount = reservation.product.price * reservation.quantity;

        const order = await tx.order.create({
          data: { userId, reservationId, totalAmount },
        });

        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: 'COMPLETED' },
        });

        // Audit log: quantity is positive — confirms units sold definitively
        await tx.inventoryLog.create({
          data: {
            productId: reservation.productId,
            reservationId,
            changeAmount: reservation.quantity,
            reason: 'SOLD',
          },
        });

        return { orderId: order.id, totalAmount };
      },
      {
        // Also Serializable to prevent concurrent checkouts on the same reservation
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    res.status(201).json(result);
  } catch (err: unknown) {
    next(err);
  }
};
export const cancelReservation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { reservationId } = CheckoutSchema.parse(req.body);
    const userId = req.userId;

    await prisma.$transaction(
      async (tx) => {
        const reservation = await tx.reservation.findUnique({
          where: { id: reservationId },
        });

        if (!reservation) {
          throw new AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
        }

        if (reservation.userId !== userId) {
          throw new AppError('You do not own this reservation', 403, 'FORBIDDEN');
        }

        if (reservation.status !== 'PENDING') {
          throw new AppError('Only pending reservations can be cancelled', 409, 'INVALID_STATUS');
        }

        // 1. Release stock back
        await tx.product.update({
          where: { id: reservation.productId },
          data: { stock: { increment: reservation.quantity } },
        });

        // 2. Mark as CANCELLED
        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: 'CANCELLED' },
        });

        // 3. Log the release
        await tx.inventoryLog.create({
          data: {
            productId: reservation.productId,
            reservationId,
            changeAmount: reservation.quantity,
            reason: 'RELEASED',
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    res.status(200).json({ message: 'Reservation cancelled and stock released' });
  } catch (err: unknown) {
    next(err);
  }
};

export const getActiveReservation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.userId;

    const reservation = await prisma.reservation.findFirst({
      where: {
        userId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!reservation) {
      res.status(200).json(null);
      return;
    }

    res.status(200).json({
      reservationId: reservation.id,
      expiresAt: reservation.expiresAt,
    });
  } catch (err: unknown) {
    next(err);
  }
};

