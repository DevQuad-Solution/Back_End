import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  getUserTransactionHistories,
  handleWebhook,
} from '../controllers/transaction/transactionControllers';
import { transactionRateLimit } from '../middlewares/rateLimiter';

const route = Router();

// Rate limit transaction endpoints
route.use(transactionRateLimit);

route.get('/transaction', authMiddleware, getUserTransactionHistories);
route.post('/transaction/webhook', handleWebhook);

export default route;
