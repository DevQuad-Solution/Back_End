import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import {
  fetchAllNotifications,
  fetchNotificationForUser,
  saveWaitList,
} from '../controllers/notification/notificationController';

const route = Router();

// Admin route - fetch all notifications in the system
route.get('/notifications', authMiddleware, requireRole('admin'), fetchAllNotifications);

// User route - fetch notifications for the authenticated user
route.get('/notifications/me', authMiddleware, fetchNotificationForUser);

// User route - for saving user waitlists
route.post('/notifications/waitlist', saveWaitList);

export default route;
