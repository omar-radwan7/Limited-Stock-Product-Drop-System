import { Request, Response, NextFunction } from 'express';
import { reserveProduct, checkout } from '../controllers/reservations.controller';
import prisma from '../lib/prisma';

// --------------------------------------------------------------------------
// Prisma mock — replaces the entire client with jest fns
// --------------------------------------------------------------------------
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    $connect: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
const makeReq = (body: Record<string, unknown>): Request =>
  ({
    body,
    headers: { 'x-request-id': 'test-req-id' },
    userId: '550e8400-e29b-41d4-a716-446655440000',
  }) as unknown as Request;

const makeRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

// --------------------------------------------------------------------------
// reserveProduct tests
// --------------------------------------------------------------------------
describe('reserveProduct', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('returns 201 on successful reservation', async () => {
    const fakeReservation = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'prod-uuid', stock: 5, name: 'Drop Item', price: 99, description: 'Limited' }]),
        reservation: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(fakeReservation),
        },
        product: { update: jest.fn().mockResolvedValue({ stock: 4 }) },
        inventoryLog: { create: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const req = makeReq({ productId: '550e8400-e29b-41d4-a716-446655440002', quantity: 1 });
    const res = makeRes();

    await reserveProduct(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('calls next with 409 INSUFFICIENT_STOCK when stock is 0', async () => {
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'prod-uuid', stock: 0, name: 'Drop Item', price: 99, description: 'Limited' }]),
        reservation: { findFirst: jest.fn().mockResolvedValue(null) },
        product: { update: jest.fn() },
        inventoryLog: { create: jest.fn() },
      };
      return fn(tx);
    });

    const req = makeReq({ productId: '550e8400-e29b-41d4-a716-446655440002', quantity: 1 });
    const res = makeRes();

    await reserveProduct(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INSUFFICIENT_STOCK', statusCode: 409 }),
    );
  });

  it('calls next with 409 DUPLICATE_RESERVATION when user already has a pending reservation', async () => {
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'prod-uuid', stock: 10, name: 'Drop Item', price: 99, description: 'Limited' }]),
        reservation: { findFirst: jest.fn().mockResolvedValue({ id: 'existing-res' }) },
        product: { update: jest.fn() },
        inventoryLog: { create: jest.fn() },
      };
      return fn(tx);
    });

    const req = makeReq({ productId: '550e8400-e29b-41d4-a716-446655440002', quantity: 1 });
    const res = makeRes();

    await reserveProduct(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'DUPLICATE_RESERVATION', statusCode: 409 }),
    );
  });

  it('calls next with ZodError on invalid input', async () => {
    const req = makeReq({ productId: 'not-a-uuid', quantity: -1 });
    const res = makeRes();

    await reserveProduct(req, res, next);

    const error: unknown = (next as jest.Mock).mock.calls[0]?.[0];
    expect(error).toBeDefined();
    // ZodError bubbles up without being caught as AppError
    expect(error).toHaveProperty('issues');
  });
});

// --------------------------------------------------------------------------
// checkout tests
// --------------------------------------------------------------------------
describe('checkout', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('returns 201 on successful checkout', async () => {
    const fakeReservation = {
      id: 'res-uuid-001',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      productId: 'prod-uuid',
      quantity: 1,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      product: { price: 99 },
    };

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        reservation: {
          findUnique: jest.fn().mockResolvedValue(fakeReservation),
          update: jest.fn().mockResolvedValue({ ...fakeReservation, status: 'COMPLETED' }),
        },
        order: { create: jest.fn().mockResolvedValue({ id: 'order-uuid', totalAmount: 99 }) },
        inventoryLog: { create: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const req = makeReq({ reservationId: '550e8400-e29b-41d4-a716-446655440003' });
    const res = makeRes();

    await checkout(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('calls next with 410 RESERVATION_EXPIRED when expiresAt is in the past', async () => {
    const expired = {
      id: 'res-uuid-001',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      productId: 'prod-uuid',
      quantity: 1,
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 1000), // already expired
      product: { price: 99 },
    };

    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        reservation: { findUnique: jest.fn().mockResolvedValue(expired), update: jest.fn() },
        order: { create: jest.fn() },
        inventoryLog: { create: jest.fn() },
      };
      return fn(tx);
    });

    const req = makeReq({ reservationId: '550e8400-e29b-41d4-a716-446655440003' });
    const res = makeRes();

    await checkout(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'RESERVATION_EXPIRED', statusCode: 410 }),
    );
  });
});
