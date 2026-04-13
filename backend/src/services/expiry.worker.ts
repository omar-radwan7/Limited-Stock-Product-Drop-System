import { Prisma } from '@prisma/client';
import cron from 'node-cron';
import prisma from '../lib/prisma';

export const initExpiryWorker = (): void => {
  cron.schedule('* * * * *', () => {
    // Fire-and-forget — errors are caught internally and logged
    // The cron itself never crashes the process
    void processExpiredReservations();
  });

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'EXPIRY_WORKER_INIT',
      message: 'Reservation expiry worker initialized (runs every 60 seconds)',
    }),
  );
};

/**
 * Each reservation gets its own transaction.
 * A single giant transaction over many rows would:
 * 1. Hold locks for too long, blocking user reservations/checkouts
 * 2. Risk deadlocks with concurrent Serializable transactions
 * 3. Fail all-or-nothing if any single update errors
 */
export const processExpiredReservations = async (): Promise<number> => {
  const now = new Date();

  const expiredReservations = await prisma.reservation.findMany({
    where: { status: 'PENDING', expiresAt: { lt: now } },
    select: { id: true, productId: true, quantity: true },
  });

  if (expiredReservations.length === 0) return 0;

  let processed = 0;
  let failed = 0;

  for (const reservation of expiredReservations) {
    try {
      await prisma.$transaction(
        async (tx) => {
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
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
        // ReadCommitted is sufficient here: we're restoring stock based on
        // a concrete reservation row, not doing a phantom-read-sensitive check
      );

      processed++;
    } catch (err: unknown) {
      failed++;
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          action: 'EXPIRY_WORKER_ROW_FAILURE',
          reservationId: reservation.id,
          error: err instanceof Error ? err.message : 'unknown',
        }),
      );
      // Continue to next reservation — one failure must not block others
    }
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'EXPIRY_WORKER_RUN',
      processed,
      failed,
      total: expiredReservations.length,
    }),
  );

  return processed;
};
