import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { dashboard } from '../controllers/attendant/attendantControllers';
import { requireRole } from '../middlewares/roleMiddleware';
import { attendantRateLimit } from '../middlewares/rateLimiter';

const route = Router();

// Apply attendant route limits
route.use(attendantRateLimit);

route.get('/attendant/dashboard', authMiddleware, requireRole('admin', 'attendant'), dashboard);

export default route;
