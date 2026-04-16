import { Response } from 'express';
import jwt, { Secret, PrivateKey, SignOptions, JwtPayload } from 'jsonwebtoken';
import { Request } from '../utils/customRequest';

export interface JWTPayload {
  userId: string;
  email: string;
  [key: string]: any;
}

/**
 *
 * Generate jwt token by signing received payloads
 * @param payload The user's data to create token
 * @param secret The secret key
 * @param options jwt options
 * @returns token the result of the signature
 */
export const generateToken = (payload: JWTPayload, secret: string, options?: SignOptions) => {
  try {
    const token = jwt.sign(payload, secret as Secret, options);
    return token;
  } catch (error) {
    console.error(`Error creating token: ${error}`);
    throw new Error('Error creating token');
  }
};

/**
 * Decodes the received jwt token
 * @param token The signed jwt token
 * @param secret Secret key to verify
 * @returns jwt payload / user details
 */
export const verifyToken = (token: string, secret: Secret): string | JwtPayload => {
  try {
    const decoded = jwt.verify(token, secret as Secret);
    // console.log('Decoded 1: ', decoded);
    return decoded;
  } catch (error: any) {
    console.error(`Error validating token: ${error}`);
    throw error;
    throw new Error('Error validating token: ' + error.message);
  }
};

/**
 *
 * @param res
 * @param name
 * @param value
 * @param maxAge
 */
export const saveCookies = async (res: Response, name: string, value: string, maxAge = 3600000) => {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.ENV === 'production',
    sameSite: 'strict',
    maxAge,
  });
};

/**
 *
 * @param req
 * @param cookieName
 * @returns
 */
// Fetch a specific cookie by name
export const getCookies = (req: Request, cookieName: string) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null; // No cookies found
  }
  let cookies: any;
  cookieHeader.split(';').forEach((cookie: any) => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = decodeURIComponent(value);
  });

  return cookies[cookieName] || null; // Return specific cookie or null if not found
};
