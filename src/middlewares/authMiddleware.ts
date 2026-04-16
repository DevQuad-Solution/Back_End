import { Request } from '../utils/customRequest';
import { NextFunction, Response } from 'express';
import { errorHandler, resSender } from '../utils/responseService';
import { modifyUserResponse } from '../utils/modifyResponse';
import { verifyToken } from '../utils/tokenService';
import { Account } from '../models/account';

const jwtAccess = process.env.ACCESS_SECRET as string;

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the auth token from request headers
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return resSender(res, 401, 'fail', 'No token');

    const decoded = verifyToken(token, jwtAccess) as any;
    const user = await Account.findById(decoded.userId);
    if (!user) return resSender(res, 401, 'fail', 'Invalid token');

    req.user = modifyUserResponse(user);
    req.userRole = user.role;

    next();
  } catch (error: any) {
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);

    if (error.name === 'TokenExpiredError') {
      return resSender(res, 401, 'fail', 'Token has expired, please login again');
    }

    return resSender(res, 401, 'fail', 'Invalid token or authentication failed');
  }
};
