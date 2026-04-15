"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const expiry_worker_1 = require("../services/expiry.worker");
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
const mockPrisma = prisma_1.default;
describe('processExpiredReservations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('returns 0 when no expired reservations exist', async () => {
        mockPrisma.reservation.findMany.mockResolvedValue([]);
        const count = await (0, expiry_worker_1.processExpiredReservations)();
        expect(count).toBe(0);
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
    it('finds expired reservations and processes each one in its own transaction', async () => {
        const fakeReservations = [
            { id: 'res-001', productId: 'prod-001', quantity: 2 },
            { id: 'res-002', productId: 'prod-001', quantity: 1 },
        ];
        mockPrisma.reservation.findMany.mockResolvedValue(fakeReservations);
        const mockTx = {
            reservation: { update: jest.fn().mockResolvedValue({}) },
            product: { update: jest.fn().mockResolvedValue({}) },
            inventoryLog: { create: jest.fn().mockResolvedValue({}) },
        };
        mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));
        const count = await (0, expiry_worker_1.processExpiredReservations)();
        // One transaction per reservation
        expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
        expect(count).toBe(2);
    });
    it('restores stock for each expired reservation', async () => {
        const fakeReservation = { id: 'res-001', productId: 'prod-001', quantity: 3 };
        mockPrisma.reservation.findMany.mockResolvedValue([fakeReservation]);
        const mockTxUpdate = jest.fn().mockResolvedValue({});
        const mockInventoryCreate = jest.fn().mockResolvedValue({});
        const mockTx = {
            reservation: { update: mockTxUpdate },
            product: { update: mockTxUpdate },
            inventoryLog: { create: mockInventoryCreate },
        };
        mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));
        await (0, expiry_worker_1.processExpiredReservations)();
        // Stock increment call
        expect(mockTxUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'prod-001' },
            data: { stock: { increment: 3 } },
        }));
    });
    it('creates an InventoryLog entry with reason EXPIRED and positive changeAmount', async () => {
        const fakeReservation = { id: 'res-001', productId: 'prod-001', quantity: 2 };
        mockPrisma.reservation.findMany.mockResolvedValue([fakeReservation]);
        const mockInventoryCreate = jest.fn().mockResolvedValue({});
        const mockTx = {
            reservation: { update: jest.fn().mockResolvedValue({}) },
            product: { update: jest.fn().mockResolvedValue({}) },
            inventoryLog: { create: mockInventoryCreate },
        };
        mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx));
        await (0, expiry_worker_1.processExpiredReservations)();
        expect(mockInventoryCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                reason: 'EXPIRED',
                changeAmount: 2,
                reservationId: 'res-001',
            }),
        }));
    });
    it('continues processing remaining reservations if one transaction fails', async () => {
        const fakeReservations = [
            { id: 'res-fail', productId: 'prod-001', quantity: 1 },
            { id: 'res-ok', productId: 'prod-002', quantity: 1 },
        ];
        mockPrisma.reservation.findMany.mockResolvedValue(fakeReservations);
        mockPrisma.$transaction
            .mockRejectedValueOnce(new Error('DB lock timeout'))
            .mockImplementationOnce(async (fn) => {
            const tx = {
                reservation: { update: jest.fn().mockResolvedValue({}) },
                product: { update: jest.fn().mockResolvedValue({}) },
                inventoryLog: { create: jest.fn().mockResolvedValue({}) },
            };
            return fn(tx);
        });
        const count = await (0, expiry_worker_1.processExpiredReservations)();
        // Should complete 1 even though 1 failed
        expect(count).toBe(1);
    });
});
//# sourceMappingURL=expiryWorker.test.js.map