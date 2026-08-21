"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const attendantControllers_1 = require("../controllers/attendant/attendantControllers");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const route = (0, express_1.Router)();
// Apply attendant route limits
route.use(rateLimiter_1.attendantRateLimit);
route.get('/attendant/dashboard', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin', 'attendant'), attendantControllers_1.dashboard);
exports.default = route;
