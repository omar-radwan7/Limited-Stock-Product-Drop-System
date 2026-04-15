"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveReservation = exports.cancelReservation = exports.checkout = exports.reserveProduct = void 0;
const client_1 = require("@prisma/client");
const reservations_validator_1 = require("../validators/reservations.validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const error_middleware_1 = require("../middleware/error.middleware");
const reserveProduct = async (req, res, next) => {
    try {
        const { productId, quantity } = reservations_validator_1.ReserveSchema.parse(req.body);
        // userId is set by authMiddleware — guaranteed to exist at this point
        const userId = req.userId;
        const result = await prisma_1.default.$transaction(async (tx) => {
            // Lock the product row for the duration of this transaction.
            // SELECT FOR UPDATE prevents any concurrent transaction from reading
            // stale stock until this one commits or rolls back.
            const products = await tx.$queryRaw `
          SELECT * FROM "Product" WHERE id = ${productId} FOR UPDATE
        `;
            if (products.length === 0) {
                throw new error_middleware_1.AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
            }
            // Safe: Prisma returns typed rows via the generic parameter
            const product = products[0];
            const existingReservation = await tx.reservation.findFirst({
                where: {
                    userId,
                    productId,
                    status: 'PENDING',
                    expiresAt: { gt: new Date() },
                },
            });
            if (existingReservation) {
                throw new error_middleware_1.AppError('You already have a pending reservation for this product', 409, 'DUPLICATE_RESERVATION');
            }
            // Guard against negative stock — absolute safety check
            if (product.stock < quantity) {
                throw new error_middleware_1.AppError('Insufficient stock available', 409, 'INSUFFICIENT_STOCK');
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
        }, {
            // Serializable prevents phantom reads and write skew — critical for inventory
            isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
        });
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
            action: 'RESERVE_SUCCESS',
            userId,
            productId,
            quantity,
            reservationId: result.reservationId,
        }));
        res.status(201).json(result);
    }
    catch (err) {
        console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
            action: 'RESERVE_FAILURE',
            error: err instanceof Error ? err.message : 'unknown',
            code: err instanceof error_middleware_1.AppError ? err.code : 'UNKNOWN',
        }));
        next(err);
    }
};
exports.reserveProduct = reserveProduct;
const checkout = async (req, res, next) => {
    try {
        const { reservationId } = reservations_validator_1.CheckoutSchema.parse(req.body);
        const userId = req.userId;
        const result = await prisma_1.default.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id: reservationId },
                include: { product: true },
            });
            if (!reservation) {
                throw new error_middleware_1.AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
            }
            // Ensure the reservation belongs to the authenticated user
            if (reservation.userId !== userId) {
                throw new error_middleware_1.AppError('You do not own this reservation', 403, 'FORBIDDEN');
            }
            if (reservation.status !== 'PENDING') {
                throw new error_middleware_1.AppError(`Reservation is already ${reservation.status}`, 409, 'INVALID_RESERVATION_STATUS');
            }
            if (reservation.expiresAt < new Date()) {
                throw new error_middleware_1.AppError('Reservation has expired', 410, 'RESERVATION_EXPIRED');
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
        }, {
            // Also Serializable to prevent concurrent checkouts on the same reservation
            isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
        });
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
};
exports.checkout = checkout;
const cancelReservation = async (req, res, next) => {
    try {
        const { reservationId } = reservations_validator_1.CheckoutSchema.parse(req.body);
        const userId = req.userId;
        await prisma_1.default.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id: reservationId },
            });
            if (!reservation) {
                throw new error_middleware_1.AppError('Reservation not found', 404, 'RESERVATION_NOT_FOUND');
            }
            if (reservation.userId !== userId) {
                throw new error_middleware_1.AppError('You do not own this reservation', 403, 'FORBIDDEN');
            }
            if (reservation.status !== 'PENDING') {
                throw new error_middleware_1.AppError('Only pending reservations can be cancelled', 409, 'INVALID_STATUS');
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
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
        res.status(200).json({ message: 'Reservation cancelled and stock released' });
    }
    catch (err) {
        next(err);
    }
};
exports.cancelReservation = cancelReservation;
const getActiveReservation = async (req, res, next) => {
    try {
        const userId = req.userId;
        const reservation = await prisma_1.default.reservation.findFirst({
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
            productId: reservation.productId,
            expiresAt: reservation.expiresAt,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getActiveReservation = getActiveReservation;
//# sourceMappingURL=reservations.controller.js.map