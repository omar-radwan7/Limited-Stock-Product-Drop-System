"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMetrics = exports.getHealth = exports.getProductById = exports.getProducts = void 0;
const reservations_validator_1 = require("../validators/reservations.validator");
const prisma_1 = __importStar(require("../lib/prisma"));
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
const getHealth = async (_req, res) => {
    // Basic health check - always returns ok for the server itself
    // Database status is reported separately
    let dbStatus = 'unknown';
    if (prisma_1.dbConnected) {
        dbStatus = 'connected';
    }
    else {
        try {
            await prisma_1.default.$queryRaw `SELECT 1`;
            dbStatus = 'connected';
        }
        catch {
            dbStatus = 'disconnected';
        }
    }
    res.status(dbStatus === 'connected' ? 200 : 503).json({
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus,
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