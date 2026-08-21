"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiControllers_1 = require("../controllers/ai/aiControllers");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
// Rate limit AI endpoints (user + admin)
router.use(rateLimiter_1.aiRateLimit);
// ── User-facing ────────────────────────────────────────────
router.get('/ai/radar', authMiddleware_1.authMiddleware, aiControllers_1.getRadarByUser);
// ── Admin: Fraud ───────────────────────────────────────────
router.get('/admin/ai/fraud-queue', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), aiControllers_1.getFraudQueue);
router.post('/admin/ai/fraud-queue/trigger', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), aiControllers_1.triggerFraud);
router.patch('/admin/ai/fraud-queue/:assessmentId', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), aiControllers_1.editFraudQueue);
router.get('/admin/ai/fraud-stats', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), aiControllers_1.getFraudStats);
// ── Admin: Radar ───────────────────────────────────────────
router.post('/admin/ai/radar/trigger', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), aiControllers_1.runsFoodRadar);
router.get('/admin/ai/radar/logs', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), aiControllers_1.getRadarLogs);
// ── Admin: Settings ────────────────────────────────────────
router.get('/admin/ai/settings', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), aiControllers_1.getAdminAISettings);
router.patch('/admin/ai/settings', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), aiControllers_1.editAISettings);
router.get('/admin/ai/costs', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), aiControllers_1.getCosts);
router.post('/admin/ai/insights', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), aiControllers_1.insights);
exports.default = router;
