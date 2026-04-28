"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const productControllers_1 = require("../controllers/product/productControllers");
const route = (0, express_1.Router)();
// Public route - anyone can fetch products
route.get('/products', productControllers_1.fetchProducts);
// Admin only routes
route.post('/products', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), productControllers_1.addProducts);
route.put('/products/status', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('admin'), productControllers_1.changeProductStatus);
exports.default = route;
