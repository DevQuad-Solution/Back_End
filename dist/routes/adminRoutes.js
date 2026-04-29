"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const adminControllers_1 = require("../controllers/admin/adminControllers");
const route = (0, express_1.Router)();
// User Management Routes
route.get('/admin/users', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.fetchAllUsers);
route.get('/admin/users/search', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.searchUsers);
route.get('/admin/users/:id', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.getUserById);
route.patch('/admin/users/:id/suspend', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.suspendUser);
// Admin Stats Route
route.get('/admin/stats', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.getStats);
// Slash Management Routes
route.get('/admin/slashes/search', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.searchSlash);
route.delete('/admin/slashes/:id/dissolve', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.dissolveSlash);
// Hub Management Routes
route.get('/admin/hubs', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.fetchHubs);
route.post('/admin/hubs', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.createHub);
route.get('/admin/hubs/:id', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.fetchHubById);
route.patch('/admin/hubs/:id/status', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.changeHubStatus);
// Hub Attendant Routes
route.post('/admin/hubs/attendant', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.asignAttendantToHub);
route.post('/admin/attendants', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.createAttendant);
route.get('/admin/attendants', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.fetchAttendants);
route.patch('/admin/attendants/:id/pin', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.resetAttendantPin);
route.patch('/admin/attendants/:id/status', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), adminControllers_1.changeAttendantStatus);
exports.default = route;
