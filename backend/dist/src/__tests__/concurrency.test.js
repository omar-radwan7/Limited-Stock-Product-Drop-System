"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const reservations_controller_1 = require("../controllers/reservations.controller");
const prisma_1 = __importDefault(require("../lib/prisma"));
jest.mock('../lib/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn(),
        $connect: jest.fn().mockResolvedValue(undefined),
    },
}));
const mockPrisma = prisma_1.default;
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
        mockPrisma.$transaction.mockImplementation(async (fn) => {
            // Prepare the next lock before awaiting the current one to ensure strictly sequential execution
            const myTurn = transactionLock;
            let releaseLock = () => { };
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
            }
            finally {
                releaseLock();
            }
        });
        const makeRequest = () => {
            const req = {
                body: { productId: '550e8400-e29b-41d4-a716-446655440002', quantity: 1 },
                headers: { 'x-request-id': `req-${Math.random()}` },
                userId: `user-${Math.random()}`,
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
            };
            const next = jest.fn();
            return { req, res: res, next };
        };
        const requests = Array.from({ length: TOTAL_REQUESTS }, () => makeRequest());
        // Fire all 10 requests concurrently
        await Promise.all(requests.map(({ req, res, next }) => (0, reservations_controller_1.reserveProduct)(req, res, next)));
        const successes = requests.filter(({ res }) => res.status.mock.calls.some(([code]) => code === 201)).length;
        const failures = requests.filter(({ next }) => next.mock.calls.some(([err]) => {
            const code = err['code'];
            return code === 'INSUFFICIENT_STOCK';
        })).length;
        expect(successes).toBe(INITIAL_STOCK);
        expect(failures).toBe(TOTAL_REQUESTS - INITIAL_STOCK);
        expect(successes + failures).toBe(TOTAL_REQUESTS);
    });
});
//# sourceMappingURL=concurrency.test.js.map