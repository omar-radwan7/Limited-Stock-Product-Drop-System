export declare const initExpiryWorker: () => void;
/**
 * Each reservation gets its own transaction.
 * A single giant transaction over many rows would:
 * 1. Hold locks for too long, blocking user reservations/checkouts
 * 2. Risk deadlocks with concurrent Serializable transactions
 * 3. Fail all-or-nothing if any single update errors
 */
export declare const processExpiredReservations: () => Promise<number>;
