"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.resSender = void 0;
/**
 * Function to send a standardized response
 * @param res - Express response object
 * @param code - HTTP status code
 * @param status - Status of the response (success/fail/error)
 * @param message - Message to be sent in the response
 * @param description - Full message explanation
 * @param data - Data to be sent in the response (optional)
 */
const resSender = (res, code, status, message, description, data = null) => {
    return res.status(code).json({
        status,
        message,
        description,
        data,
    });
};
exports.resSender = resSender;
const errorHandler = (error, res, message) => {
    console.log('Error occured: ', error.message);
    return (0, exports.resSender)(res, 500, 'error', error.message || message);
};
exports.errorHandler = errorHandler;
