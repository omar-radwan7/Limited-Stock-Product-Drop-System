import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { reserveProduct, checkout, cancelReservation, getActiveReservation } from '../controllers/reservations.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

const reserveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many reservation attempts', code: 'RATE_LIMITED', statusCode: 429 },
});

// All reservation routes require authentication
router.use(authMiddleware);

router.post('/reserve', reserveLimiter, reserveProduct);
router.post('/checkout', checkout);
router.post('/cancel', cancelReservation);
router.get('/active', getActiveReservation);

export default router;
