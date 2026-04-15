"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const reservations_controller_1 = require("../controllers/reservations.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const reserveLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many reservation attempts', code: 'RATE_LIMITED', statusCode: 429 },
});
// All reservation routes require authentication
router.use(auth_middleware_1.authMiddleware);
router.post('/reserve', reserveLimiter, reservations_controller_1.reserveProduct);
router.post('/checkout', reservations_controller_1.checkout);
router.post('/cancel', reservations_controller_1.cancelReservation);
router.get('/active', reservations_controller_1.getActiveReservation);
exports.default = router;
//# sourceMappingURL=reservations.routes.js.map