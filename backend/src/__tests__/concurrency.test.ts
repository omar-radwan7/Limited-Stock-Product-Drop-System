import { Request, Response, NextFunction } from 'express';
import { reserveProduct } from '../controllers/reservations.controller';
import prisma from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    $connect: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

/**
 * Concurrency simulation test.
 *
 * NOTE: True DB-level concurrency cannot be simulated in unit tests — that
 * requires integration tests against a real PostgreSQL instance with
 * Serializable isolation. What this test validates is that the *application-level
 * logic* (stock check inside the transaction) correctly rejects requests
 * when stock is exhausted.
 *
 * A real load test (e.g., k6 sending 100 concurrent /reserve requests)
 * against a seeded DB with stock=5 would confirm only 5 succeed.
 */
describe('Concurrency: stock exhaustion under simultaneous requests', () => {
  const INITIAL_STOCK = 3;
  const TOTAL_REQUESTS = 10;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`allows only ${INITIAL_STOCK} reservations when stock=${INITIAL_STOCK} and ${TOTAL_REQUESTS} requests fire simultaneously`, async () => {
    let currentStock = INITIAL_STOCK;

    let transactionLock = Promise.resolve();

    (mockPrisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<{ reservationId: string; expiresAt: Date }>) => {
        // Prepare the next lock before awaiting the current one to ensure strictly sequential execution
        const myTurn = transactionLock;
        let releaseLock: () => void = () => {};
        transactionLock = new Promise((resolve) => {
          releaseLock = resolve;
        });

        await myTurn;

        try {
          const tx = {
            $queryRaw: jest.fn().mockResolvedValue([
              {
                id: 'prod-uuid',
                stock: currentStock,
                name: 'Limited Drop',
                price: 99,
                description: 'Exclusive item',
              },
            ]),
            reservation: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({
                id: `res-${Math.random()}`,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
              }),
            },
            product: {
              update: jest.fn().mockImplementation(() => {
                currentStock = Math.max(0, currentStock - 1);
                return Promise.resolve({ stock: currentStock });
              }),
            },
            inventoryLog: { create: jest.fn().mockResolvedValue({}) },
          };

          return await fn(tx);
        } finally {
          releaseLock();
        }
      },
    );

    const makeRequest = (): { req: Request; res: Response; next: NextFunction } => {
      const req = {
        body: { productId: '550e8400-e29b-41d4-a716-446655440002', quantity: 1 },
        headers: { 'x-request-id': `req-${Math.random()}` },
        userId: `user-${Math.random()}`,
      } as unknown as Request;
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const next = jest.fn() as NextFunction;
      return { req, res: res as Response, next };
    };

    const requests = Array.from({ length: TOTAL_REQUESTS }, () => makeRequest());

    // Fire all 10 requests concurrently
    await Promise.all(requests.map(({ req, res, next }) => reserveProduct(req, res, next)));

    const successes = requests.filter(
      ({ res }) => (res.status as jest.Mock).mock.calls.some(([code]: [number]) => code === 201),
    ).length;

    const failures = requests.filter(
      ({ next }) =>
        (next as jest.Mock).mock.calls.some(([err]: [unknown]) => {
          const code = (err as Record<string, unknown>)['code'];
          return code === 'INSUFFICIENT_STOCK';
        }),
    ).length;

    expect(successes).toBe(INITIAL_STOCK);
    expect(failures).toBe(TOTAL_REQUESTS - INITIAL_STOCK);
    expect(successes + failures).toBe(TOTAL_REQUESTS);
  });
});
