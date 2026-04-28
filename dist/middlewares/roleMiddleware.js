"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const responseService_1 = require("../utils/responseService");
const requireRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.userRole) {
                return (0, responseService_1.resSender)(res, 403, "fail", "User role not defined");
            }
            if (!allowedRoles.includes(req.userRole)) {
                return (0, responseService_1.resSender)(res, 403, "fail", "Insufficient permissions");
            }
            next();
        }
        catch (error) {
            console.error("Role check error: ", error.message);
            (0, responseService_1.resSender)(res, 500, "error", error.message || "Failed to check role");
        }
    };
};
exports.requireRole = requireRole;
