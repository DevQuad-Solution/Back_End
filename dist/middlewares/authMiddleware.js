"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const responseService_1 = require("../utils/responseService");
const modifyResponse_1 = require("../utils/modifyResponse");
const tokenService_1 = require("../utils/tokenService");
const authControllers_1 = require("../controllers/auth/authControllers");
const jwtAccess = process.env.ACCESS_SECRET;
const authMiddleware = async (req, res, next) => {
    try {
        // Get the auth token from request headers
        const token = req.headers.authorization?.split(' ')[1];
        if (!token)
            return (0, responseService_1.resSender)(res, 401, 'fail', 'No token');
        const decoded = (0, tokenService_1.verifyToken)(token, jwtAccess);
        const user = await (0, authControllers_1.getAccount)(decoded.userId, true);
        if (!user)
            return (0, responseService_1.resSender)(res, 401, 'fail', 'Invalid token');
        req.user = (0, modifyResponse_1.modifyUserResponse)(user);
        req.userRole = user.role;
        next();
    }
    catch (error) {
        console.error('Error message:', error.message);
        console.error('Error name:', error.name);
        if (error.name === 'TokenExpiredError') {
            return (0, responseService_1.resSender)(res, 401, 'fail', 'Token has expired, please login again');
        }
        return (0, responseService_1.resSender)(res, 401, 'fail', 'Invalid token or authentication failed');
    }
};
exports.authMiddleware = authMiddleware;
