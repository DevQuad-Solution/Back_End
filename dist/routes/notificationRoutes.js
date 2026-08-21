"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const notificationController_1 = require("../controllers/notification/notificationController");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const route = (0, express_1.Router)();
// Rate limit notification-related endpoints
route.use(rateLimiter_1.notificationRateLimit);
// Admin route - fetch all notifications in the system
route.get('/notifications', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), notificationController_1.fetchAllNotifications);
// User route - fetch notifications for the authenticated user
route.get('/notifications/me', authMiddleware_1.authMiddleware, notificationController_1.fetchNotificationForUser);
// User route - for saving user waitlists
route.post('/notifications/waitlist', notificationController_1.saveWaitList);
exports.default = route;
