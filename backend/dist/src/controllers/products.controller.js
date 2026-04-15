"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetrics = exports.getHealth = exports.getProductById = exports.getProducts = void 0;
const reservations_validator_1 = require("../validators/reservations.validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const error_middleware_1 = require("../middleware/error.middleware");
const getProducts = async (req, res, next) => {
    try {
        // Validate + parse + sanitize query params — prevents sort injection
        const { page, limit, sortBy, order } = reservations_validator_1.ProductsQuerySchema.parse(req.query);
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            prisma_1.default.product.findMany({
                skip,
                take: limit,
                orderBy: { [sortBy]: order },
            }),
            prisma_1.default.product.count(),
        ]);
        // Debugging: Verify imageUrls are present
        console.log('SYNC_DEBUG: Sending products with images:', products.map(p => ({ n: p.name, img: p.imageUrl })));
        res.json({
            data: products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getProducts = getProducts;
const getProductById = async (req, res, next) => {
    try {
        const rawId = req.params['id'];
        const id = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!id) {
            throw new error_middleware_1.AppError('Product ID is required', 400, 'MISSING_PRODUCT_ID');
        }
        const product = await prisma_1.default.product.findUnique({ where: { id } });
        if (!product) {
            throw new error_middleware_1.AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
        }
        res.json(product);
    }
    catch (err) {
        next(err);
    }
};
exports.getProductById = getProductById;
const getHealth = (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
};
exports.getHealth = getHealth;
const getMetrics = async (_req, res, next) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const [totalReservations, activeReservations, totalOrders, expiredToday] = await Promise.all([
            prisma_1.default.reservation.count(),
            prisma_1.default.reservation.count({
                where: { status: 'PENDING', expiresAt: { gt: new Date() } },
            }),
            prisma_1.default.order.count(),
            prisma_1.default.reservation.count({
                where: { status: 'EXPIRED', createdAt: { gte: startOfToday } },
            }),
        ]);
        res.json({ totalReservations, activeReservations, expiredToday, totalOrders });
    }
    catch (err) {
        next(err);
    }
};
exports.getMetrics = getMetrics;
//# sourceMappingURL=products.controller.js.map