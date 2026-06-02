"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const express_1 = require("express");
const authControllers_1 = require("../controllers/auth/authControllers");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const uploadMiddleware_1 = require("../middlewares/uploadMiddleware");
const route = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'temp/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    },
});
exports.upload = (0, multer_1.default)({ storage });
route.post('/auth/', authControllers_1.signup);
route.post('/auth/onboarding', authControllers_1.onboarding);
route.post('/auth/signin', authControllers_1.signin);
route.post('/auth/attendant/signin', authControllers_1.attendantSignin);
route.post('/auth/admin/signin', authControllers_1.adminSignin);
route.post('/auth/code', authControllers_1.sendCode);
route.post('/auth/verify-code', authControllers_1.verifyCode);
route.post('/auth/reset-password', authControllers_1.resetPassword);
route.get('/auth/me', authMiddleware_1.authMiddleware, authControllers_1.getMe);
route.post('/auth/kyc', authMiddleware_1.authMiddleware, exports.upload.array('image'), uploadMiddleware_1.uploadMiddleware, authControllers_1.verifyKyc);
exports.default = route;
