import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  getUserTransactionHistories,
  handleWebhook,
} from '../controllers/transaction/transactionControllers';

const route = Router();

route.get('/transaction', authMiddleware, getUserTransactionHistories);
route.post('/transaction/webhook', handleWebhook);

export default route;
