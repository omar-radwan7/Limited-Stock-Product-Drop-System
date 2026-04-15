"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsQuerySchema = exports.CheckoutSchema = exports.ReserveSchema = void 0;
const zod_1 = require("zod");
// Reservation endpoints
exports.ReserveSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid('productId must be a valid UUID'),
    quantity: zod_1.z.number().int().min(1, 'quantity must be at least 1'),
});
exports.CheckoutSchema = zod_1.z.object({
    reservationId: zod_1.z.string().uuid('reservationId must be a valid UUID'),
});
// Valid product fields for sorting — prevents injection via arbitrary field names
const VALID_SORT_FIELDS = ['name', 'price', 'stock', 'createdAt'];
exports.ProductsQuerySchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .default('1')
        .transform(Number)
        .pipe(zod_1.z.number().int().min(1)),
    limit: zod_1.z
        .string()
        .optional()
        .default('10')
        .transform(Number)
        .pipe(zod_1.z.number().int().min(1).max(100)),
    sortBy: zod_1.z
        .enum(VALID_SORT_FIELDS)
        .optional()
        .default('createdAt'),
    order: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
});
//# sourceMappingURL=reservations.validator.js.map