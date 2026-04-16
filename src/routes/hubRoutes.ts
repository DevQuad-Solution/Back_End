import { Router } from 'express';
import { onboarding, resetPassword, sendCode, signin, signup, verifyCode } from '../controllers/auth/authControllers';

const route = Router();

route.post('/auth/', signup);
route.post('/auth/onboarding', onboarding);
route.post('/auth/signin', signin);
route.post('/auth/code', sendCode);
route.post('/auth/verify-code', verifyCode);
route.post('/auth/reset-password', resetPassword);

export default route;