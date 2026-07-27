"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeTmp = exports.singleImageUploadMiddleware = exports.uploadMiddleware = void 0;
const responseService_1 = require("../utils/responseService");
const fs_1 = __importDefault(require("fs"));
const uploadMiddleware = async (req, res, next) => {
    try {
        // Check if any file is sent
        if (!req.files || Object.values(req.files).flat().length === 0) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'No files uploaded');
        }
        let files = Object.values(req.files).flat();
        files.forEach((file) => {
            // Check file size
            if (file.size > 1024 * 1024 * 5) {
                (0, exports.removeTmp)(file.tempFilePath);
                return (0, responseService_1.resSender)(res, 400, 'fail', 'File size is too large');
            }
            // Check file type
            if (!(file.mimetype.startsWith('image/') ||
                file.mimetype.startsWith('video/') ||
                file.mimetype.startsWith('audio/') ||
                file.mimetype.startsWith('application/'))) {
                (0, exports.removeTmp)(file.tempFilePath);
                return (0, responseService_1.resSender)(res, 400, 'fail', 'File format is not supported');
            }
        });
        next();
    }
    catch (err) {
        return (0, responseService_1.resSender)(res, 500, 'error', err.message || 'An error occured');
    }
};
exports.uploadMiddleware = uploadMiddleware;
const singleImageUploadMiddleware = async (req, res, next) => {
    try {
        // Check if any file is sent
        if (!req.files || Object.values(req.files).flat().length === 0) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'No files uploaded');
        }
        let files = Object.values(req.files).flat();
        let file = files[0];
        // Check file size
        if (file.size > 1024 * 1024 * 5) {
            (0, exports.removeTmp)(file.tempFilePath);
            return (0, responseService_1.resSender)(res, 400, 'fail', 'File size is too large');
        }
        // Check file type
        if (!(file.mimetype.startsWith('image/')
        // file.mimetype.startsWith('video/') ||
        // file.mimetype.startsWith('audio/') ||
        // file.mimetype.startsWith('application/')
        )) {
            (0, exports.removeTmp)(file.tempFilePath);
            return (0, responseService_1.resSender)(res, 400, 'fail', 'File format is not supported');
        }
        next();
    }
    catch (err) {
        return (0, responseService_1.resSender)(res, 500, 'error', err.message || 'An error occured');
    }
};
exports.singleImageUploadMiddleware = singleImageUploadMiddleware;
const removeTmp = (filePath) => {
    fs_1.default.unlink(filePath, (err) => {
        if (err)
            throw err;
    });
};
exports.removeTmp = removeTmp;
