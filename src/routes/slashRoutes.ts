import { Router } from 'express';
import {
  createSlash,
  deleteSlash,
  editSlash,
  fetchSlash,
  fetchSlashes,
  getQrForSlash,
  joinSlash,
  leaveSlash,
  searchSlash,
  verifyQr,
} from '../controllers/slash/slashControllers';
import { authMiddleware } from '../middlewares/authMiddleware';
import { slashRateLimit } from '../middlewares/rateLimiter';

const route = Router();

// Apply rate limits for slash endpoints
route.use(slashRateLimit);

route.get('/slash/', authMiddleware, fetchSlashes);
route.get('/slash/search', authMiddleware, searchSlash);
route.post('/slash/', authMiddleware, createSlash);

route.get('/slash/qr', authMiddleware, getQrForSlash);
route.post('/slash/qr', authMiddleware, verifyQr);

route.get('/slash/:id', authMiddleware, fetchSlash);
route.post('/slash/:id', authMiddleware, joinSlash);
route.put('/slash/:id', authMiddleware, editSlash);
route.patch('/slash/:id', authMiddleware, leaveSlash);
route.delete('/slash/:id', authMiddleware, deleteSlash);

route.post('/slash/claim', authMiddleware, verifyQr);

export default route;
