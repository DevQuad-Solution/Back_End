"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const attendantControllers_1 = require("../controllers/attendant/attendantControllers");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const route = (0, express_1.Router)();
route.get('/attendant/dashboard', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin', 'attendant'), attendantControllers_1.dashboard);
exports.default = route;
