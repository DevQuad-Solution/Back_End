"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCookies = exports.saveCookies = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 *
 * Generate jwt token by signing received payloads
 * @param payload The user's data to create token
 * @param secret The secret key
 * @param options jwt options
 * @returns token the result of the signature
 */
const generateToken = (payload, secret, options) => {
    try {
        const token = jsonwebtoken_1.default.sign(payload, secret, options);
        return token;
    }
    catch (error) {
        console.error(`Error creating token: ${error}`);
        throw new Error('Error creating token');
    }
};
exports.generateToken = generateToken;
/**
 * Decodes the received jwt token
 * @param token The signed jwt token
 * @param secret Secret key to verify
 * @returns jwt payload / user details
 */
const verifyToken = (token, secret) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // console.log('Decoded 1: ', decoded);
        return decoded;
    }
    catch (error) {
        console.error(`Error validating token: ${error}`);
        throw error;
        throw new Error('Error validating token: ' + error.message);
    }
};
exports.verifyToken = verifyToken;
/**
 *
 * @param res
 * @param name
 * @param value
 * @param maxAge
 */
const saveCookies = async (res, name, value, maxAge = 3600000) => {
    res.cookie(name, value, {
        httpOnly: true,
        secure: process.env.ENV === 'production',
        sameSite: 'strict',
        maxAge,
    });
};
exports.saveCookies = saveCookies;
/**
 *
 * @param req
 * @param cookieName
 * @returns
 */
// Fetch a specific cookie by name
const getCookies = (req, cookieName) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
        return null; // No cookies found
    }
    let cookies;
    cookieHeader.split(';').forEach((cookie) => {
        const [name, value] = cookie.trim().split('=');
        cookies[name] = decodeURIComponent(value);
    });
    return cookies[cookieName] || null; // Return specific cookie or null if not found
};
exports.getCookies = getCookies;
