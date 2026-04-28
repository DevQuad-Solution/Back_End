"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const transactionControllers_1 = require("../controllers/transaction/transactionControllers");
const route = (0, express_1.Router)();
route.get('/transaction', authMiddleware_1.authMiddleware, transactionControllers_1.getUserTransactionHistories);
route.post('/transaction/webhook', transactionControllers_1.handleWebhook);
exports.default = route;
