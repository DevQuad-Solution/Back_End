import { Router } from 'express';
import {
  getMe,
  onboarding,
  resetPassword,
  sendCode,
  signin,
  signup,
  verifyCode,
} from '../controllers/auth/authControllers';
import { authMiddleware } from '../middlewares/authMiddleware';

const route = Router();

route.post('/auth/', signup);
route.post('/auth/onboarding', onboarding);
route.post('/auth/signin', signin);
route.post('/auth/code', sendCode);
route.post('/auth/verify-code', verifyCode);
route.post('/auth/reset-password', resetPassword);
route.get('/auth/me', authMiddleware, getMe);

export default route;
