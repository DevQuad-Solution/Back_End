import { NextFunction, Response } from 'express';
import { resSender } from '../utils/responseService';
import { Request } from '../utils/customRequest';

import fs from 'fs';

export const uploadMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if any file is sent
    if (!req.files || Object.values(req.files).flat().length === 0) {
      return resSender(res, 400, 'fail', 'No files uploaded');
    }

    let files = Object.values(req.files).flat();

    files.forEach((file) => {
      // Check file size
      if (file.size > 1024 * 1024 * 5) {
        removeTmp(file.tempFilePath);
        return resSender(res, 400, 'fail', 'File size is too large');
      }

      // Check file type
      if (
        !(
          file.mimetype.startsWith('image/') ||
          file.mimetype.startsWith('video/') ||
          file.mimetype.startsWith('audio/') ||
          file.mimetype.startsWith('application/')
        )
      ) {
        removeTmp(file.tempFilePath);
        return resSender(res, 400, 'fail', 'File format is not supported');
      }
    });

    next();
  } catch (err: any) {
    return resSender(res, 500, 'error', err.message || 'An error occured');
  }
};

export const singleImageUploadMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if any file is sent
    if (!req.files || Object.values(req.files).flat().length === 0) {
      return resSender(res, 400, 'fail', 'No files uploaded');
    }

    let files = Object.values(req.files).flat();

    let file = files[0];
    // Check file size
    if (file.size > 1024 * 1024 * 5) {
      removeTmp(file.tempFilePath);
      return resSender(res, 400, 'fail', 'File size is too large');
    }

    // Check file type
    if (
      !(
        file.mimetype.startsWith('image/')
        // file.mimetype.startsWith('video/') ||
        // file.mimetype.startsWith('audio/') ||
        // file.mimetype.startsWith('application/')
      )
    ) {
      removeTmp(file.tempFilePath);
      return resSender(res, 400, 'fail', 'File format is not supported');
    }
    next();
  } catch (err: any) {
    return resSender(res, 500, 'error', err.message || 'An error occured');
  }
};

export const removeTmp = (filePath: any) => {
  fs.unlink(filePath, (err: any) => {
    if (err) throw err;
  });
};
