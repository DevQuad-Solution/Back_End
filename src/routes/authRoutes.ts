import { Router } from 'express';
import {
  adminSignin,
  attendantSignin,
  getMe,
  onboarding,
  refreshAccessToken,
  resetPassword,
  sendCode,
  signin,
  signup,
  verifyCode,
  verifyKyc,
} from '../controllers/auth/authControllers';
import { authMiddleware } from '../middlewares/authMiddleware';
import multer from 'multer';
import { uploadMiddleware } from '../middlewares/uploadMiddleware';

const route = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'temp/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

export const upload = multer({ storage });

route.post('/auth/', signup);
route.post('/auth/onboarding', onboarding);
route.post('/auth/signin', signin);
route.post('/auth/attendant/signin', attendantSignin);
route.post('/auth/admin/signin', adminSignin);
route.post('/auth/code', sendCode);
route.post('/auth/verify-code', verifyCode);
route.post('/auth/reset-password', resetPassword);
route.get('/auth/me', authMiddleware, getMe);
route.post('/auth/kyc', authMiddleware, upload.array('image'), uploadMiddleware, verifyKyc);
route.post('/auth/refresh', refreshAccessToken);

export default route;
