import { Router } from 'express';
import {
  editAISettings,
  editFraudQueue,
  getAdminAISettings,
  getCosts,
  getFraudQueue,
  getFraudStats,
  getRadarByUser,
  getRadarLogs,
  insights,
  runsFoodRadar,
  triggerFraud,
} from '../controllers/ai/aiControllers';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';

const router = Router();

// ── User-facing ────────────────────────────────────────────
router.get('/ai/radar', authMiddleware, getRadarByUser);

// ── Admin: Fraud ───────────────────────────────────────────
router.get('/admin/ai/fraud-queue', authMiddleware, requireRole('admin'), getFraudQueue);

router.post('/admin/ai/fraud-queue/trigger', authMiddleware, requireRole('admin'), triggerFraud);

router.patch(
  '/admin/ai/fraud-queue/:assessmentId',
  authMiddleware,
  requireRole('admin'),
  editFraudQueue,
);

router.get('/admin/ai/fraud-stats', authMiddleware, requireRole('admin'), getFraudStats);

// ── Admin: Radar ───────────────────────────────────────────
router.post('/admin/ai/radar/trigger', authMiddleware, requireRole('admin'), runsFoodRadar);

router.get('/admin/ai/radar/logs', authMiddleware, requireRole('admin'), getRadarLogs);

// ── Admin: Settings ────────────────────────────────────────
router.get('/admin/ai/settings', authMiddleware, requireRole('admin'), getAdminAISettings);

router.patch('/admin/ai/settings', authMiddleware, requireRole('admin'), editAISettings);

router.get('/admin/ai/costs', authMiddleware, requireRole('admin'), getCosts);

router.post('/admin/ai/insights', authMiddleware, requireRole('admin'), insights);

export default router;
