import { NextFunction, Response } from "express";
import { resSender } from "../utils/responseService";
import { Request } from "../utils/customRequest";

export const requireRole = (...allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.userRole) {
        return resSender(res, 403, "fail", "User role not defined");
      }

      if (!allowedRoles.includes(req.userRole as string)) {
        return resSender(res, 403, "fail", "Insufficient permissions");
      }

      next();
    } catch (error: any) {
      console.error("Role check error: ", error.message);
      resSender(res, 500, "error", error.message || "Failed to check role");
    }
  };
};
