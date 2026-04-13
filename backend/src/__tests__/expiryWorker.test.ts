import prisma from '../lib/prisma';
import { processExpiredReservations } from '../services/expiry.worker';

// --------------------------------------------------------------------------
// Prisma mock
// --------------------------------------------------------------------------
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    reservation: { findMany: jest.fn() },
    $transaction: jest.fn(),
    $connect: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('processExpiredReservations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 0 when no expired reservations exist', async () => {
    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

    const count = await processExpiredReservations();

    expect(count).toBe(0);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('finds expired reservations and processes each one in its own transaction', async () => {
    const fakeReservations = [
      { id: 'res-001', productId: 'prod-001', quantity: 2 },
      { id: 'res-002', productId: 'prod-001', quantity: 1 },
    ];

    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue(fakeReservations);

    const mockTx = {
      reservation: { update: jest.fn().mockResolvedValue({}) },
      product: { update: jest.fn().mockResolvedValue({}) },
      inventoryLog: { create: jest.fn().mockResolvedValue({}) },
    };

    (mockPrisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx),
    );

    const count = await processExpiredReservations();

    // One transaction per reservation
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    expect(count).toBe(2);
  });

  it('restores stock for each expired reservation', async () => {
    const fakeReservation = { id: 'res-001', productId: 'prod-001', quantity: 3 };

    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([fakeReservation]);

    const mockTxUpdate = jest.fn().mockResolvedValue({});
    const mockInventoryCreate = jest.fn().mockResolvedValue({});

    const mockTx = {
      reservation: { update: mockTxUpdate },
      product: { update: mockTxUpdate },
      inventoryLog: { create: mockInventoryCreate },
    };

    (mockPrisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx),
    );

    await processExpiredReservations();

    // Stock increment call
    expect(mockTxUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-001' },
        data: { stock: { increment: 3 } },
      }),
    );
  });

  it('creates an InventoryLog entry with reason EXPIRED and positive changeAmount', async () => {
    const fakeReservation = { id: 'res-001', productId: 'prod-001', quantity: 2 };

    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue([fakeReservation]);

    const mockInventoryCreate = jest.fn().mockResolvedValue({});
    const mockTx = {
      reservation: { update: jest.fn().mockResolvedValue({}) },
      product: { update: jest.fn().mockResolvedValue({}) },
      inventoryLog: { create: mockInventoryCreate },
    };

    (mockPrisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx),
    );

    await processExpiredReservations();

    expect(mockInventoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: 'EXPIRED',
          changeAmount: 2,
          reservationId: 'res-001',
        }),
      }),
    );
  });

  it('continues processing remaining reservations if one transaction fails', async () => {
    const fakeReservations = [
      { id: 'res-fail', productId: 'prod-001', quantity: 1 },
      { id: 'res-ok', productId: 'prod-002', quantity: 1 },
    ];

    (mockPrisma.reservation.findMany as jest.Mock).mockResolvedValue(fakeReservations);

    (mockPrisma.$transaction as jest.Mock)
      .mockRejectedValueOnce(new Error('DB lock timeout'))
      .mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
        const tx = {
          reservation: { update: jest.fn().mockResolvedValue({}) },
          product: { update: jest.fn().mockResolvedValue({}) },
          inventoryLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

    const count = await processExpiredReservations();

    // Should complete 1 even though 1 failed
    expect(count).toBe(1);
  });
});
