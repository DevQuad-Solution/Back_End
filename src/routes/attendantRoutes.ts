import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { dashboard } from '../controllers/attendant/attendantControllers';
import { requireRole } from '../middlewares/roleMiddleware';

const route = Router();

route.get('/attendant/dashboard', authMiddleware, requireRole('admin', 'attendant'), dashboard);

export default route;
