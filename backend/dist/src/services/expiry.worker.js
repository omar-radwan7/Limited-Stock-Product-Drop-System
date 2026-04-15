"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processExpiredReservations = exports.initExpiryWorker = void 0;
const client_1 = require("@prisma/client");
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const initExpiryWorker = () => {
    node_cron_1.default.schedule('* * * * *', () => {
        // Fire-and-forget — errors are caught internally and logged
        // The cron itself never crashes the process
        void (0, exports.processExpiredReservations)();
    });
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'EXPIRY_WORKER_INIT',
        message: 'Reservation expiry worker initialized (runs every 60 seconds)',
    }));
};
exports.initExpiryWorker = initExpiryWorker;
/**
 * Each reservation gets its own transaction.
 * A single giant transaction over many rows would:
 * 1. Hold locks for too long, blocking user reservations/checkouts
 * 2. Risk deadlocks with concurrent Serializable transactions
 * 3. Fail all-or-nothing if any single update errors
 */
const processExpiredReservations = async () => {
    const now = new Date();
    const expiredReservations = await prisma_1.default.reservation.findMany({
        where: { status: 'PENDING', expiresAt: { lt: now } },
        select: { id: true, productId: true, quantity: true },
    });
    if (expiredReservations.length === 0)
        return 0;
    let processed = 0;
    let failed = 0;
    for (const reservation of expiredReservations) {
        try {
            await prisma_1.default.$transaction(async (tx) => {
                // Update each reservation atomically but independently
                await tx.reservation.update({
                    where: { id: reservation.id },
                    data: { status: 'EXPIRED' },
                });
                await tx.product.update({
                    where: { id: reservation.productId },
                    data: { stock: { increment: reservation.quantity } },
                });
                await tx.inventoryLog.create({
                    data: {
                        productId: reservation.productId,
                        reservationId: reservation.id,
                        changeAmount: reservation.quantity, // positive = stock restored
                        reason: 'EXPIRED',
                    },
                });
            }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.ReadCommitted });
            processed++;
        }
        catch (err) {
            failed++;
            console.error(JSON.stringify({
                timestamp: new Date().toISOString(),
                action: 'EXPIRY_WORKER_ROW_FAILURE',
                reservationId: reservation.id,
                error: err instanceof Error ? err.message : 'unknown',
            }));
            // Continue to next reservation — one failure must not block others
        }
    }
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        action: 'EXPIRY_WORKER_RUN',
        processed,
        failed,
        total: expiredReservations.length,
    }));
    return processed;
};
exports.processExpiredReservations = processExpiredReservations;
//# sourceMappingURL=expiry.worker.js.map