"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const notificationController_1 = require("../controllers/notification/notificationController");
const route = (0, express_1.Router)();
// Admin route - fetch all notifications in the system
route.get('/notifications', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), notificationController_1.fetchAllNotifications);
// User route - fetch notifications for the authenticated user
route.get('/notifications/me', authMiddleware_1.authMiddleware, notificationController_1.fetchNotificationForUser);
exports.default = route;
