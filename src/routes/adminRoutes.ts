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
route.patch('/admin/hubs/:id/status', authMiddleware, requireRole('admin'), changeHubStatus);

// Hub Attendant Routes
route.post(
  '/admin/hubs/attendant',
  authMiddleware,
  requireRole('admin'),
  asignAttendantToHub,
);
route.post('/admin/attendants', authMiddleware, requireRole('admin'), createAttendant);
route.get('/admin/attendants', authMiddleware, requireRole('admin'), fetchAttendants);
route.patch('/admin/attendants/:id/pin', authMiddleware, requireRole('admin'), resetAttendantPin);
route.patch(
  '/admin/attendants/:id/status',
  authMiddleware,
  requireRole('admin'),
  changeAttendantStatus,
);

export default route;
