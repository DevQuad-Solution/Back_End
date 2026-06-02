import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import {
  fetchAllUsers,
  searchUsers,
  getUserById,
  getStats,
  searchSlash,
  dissolveSlash,
  suspendUser,
  fetchHubs,
  changeHubStatus,
  createHub,
  fetchHubById,
  asignAttendantToHub,
  createAttendant,
  fetchAttendants,
  resetAttendantPin,
  changeAttendantStatus,
} from '../controllers/admin/adminControllers';
import {
  getFeatureFlags,
  toggleFeatureFlag,
  getPlatformConfig,
  updatePlatformConfig,
  getPaymentSettings,
  updatePaymentSettings,
  getKycSettings,
  updateKycSettings,
  getFeeHistory,
  pausePlatform,
  resumePlatform,
  disableSignups,
  enableSignups,
  freezeEscrow,
  unfreezeEscrow,
} from '../controllers/admin/settingsControllers';

const route = Router();

// User Management Routes
route.get('/admin/users', authMiddleware, requireRole('admin'), fetchAllUsers);
route.get('/admin/users/search', authMiddleware, requireRole('admin'), searchUsers);
route.get('/admin/users/:id', authMiddleware, requireRole('admin'), getUserById);
route.patch('/admin/users/:id/suspend', authMiddleware, requireRole('admin'), suspendUser);

// Admin Stats Route
route.get('/admin/stats', authMiddleware, requireRole('admin'), getStats);

// Slash Management Routes
route.get('/admin/slashes/search', authMiddleware, requireRole('admin'), searchSlash);
route.delete('/admin/slashes/:id/dissolve', authMiddleware, requireRole('admin'), dissolveSlash);

// Hub Management Routes
route.get('/admin/hubs', authMiddleware, requireRole('admin'), fetchHubs);
route.post('/admin/hubs', authMiddleware, requireRole('admin'), createHub);
route.get('/admin/hubs/:id', authMiddleware, requireRole('admin'), fetchHubById);
route.patch('/admin/hubs/status', authMiddleware, requireRole('admin'), changeHubStatus);

// Hub Attendant Routes
route.post('/admin/hubs/attendant', authMiddleware, requireRole('admin'), asignAttendantToHub);
route.post('/admin/attendants', authMiddleware, requireRole('admin'), createAttendant);
route.get('/admin/attendants', authMiddleware, requireRole('admin'), fetchAttendants);
route.patch('/admin/attendants/:id/pin', authMiddleware, requireRole('admin'), resetAttendantPin);
route.patch(
  '/admin/attendants/status',
  authMiddleware,
  requireRole('admin'),
  changeAttendantStatus,
);


// ========== New Settings Routes ==========
// Feature Flags
route.get('/admin/settings/flags', authMiddleware, requireRole('admin'), getFeatureFlags);
route.patch('/admin/settings/flags/:flag_key', authMiddleware, requireRole('admin'), toggleFeatureFlag);

// Platform Config
route.get('/admin/settings/config', authMiddleware, requireRole('admin'), getPlatformConfig);
route.patch('/admin/settings/config', authMiddleware, requireRole('admin'), updatePlatformConfig);

// Payment Settings
route.get('/admin/settings/payments', authMiddleware, requireRole('admin'), getPaymentSettings);
route.patch('/admin/settings/payments', authMiddleware, requireRole('admin'), updatePaymentSettings);

// KYC Settings
route.get('/admin/settings/kyc', authMiddleware, requireRole('admin'), getKycSettings);
route.patch('/admin/settings/kyc', authMiddleware, requireRole('admin'), updateKycSettings);

// Fee History
route.get('/admin/settings/fee-history', authMiddleware, requireRole('admin'), getFeeHistory);

// Danger Zone
route.post('/admin/platform/pause', authMiddleware, requireRole('admin'), pausePlatform);
route.post('/admin/platform/resume', authMiddleware, requireRole('admin'), resumePlatform);
route.post('/admin/platform/disable-signups', authMiddleware, requireRole('admin'), disableSignups);
route.post('/admin/platform/enable-signups', authMiddleware, requireRole('admin'), enableSignups);
route.post('/admin/platform/freeze-escrow', authMiddleware, requireRole('admin'), freezeEscrow);
route.post('/admin/platform/unfreeze-escrow', authMiddleware, requireRole('admin'), unfreezeEscrow);

export default route;
