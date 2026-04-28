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

const route = Router();

route.get('/slash/', authMiddleware, fetchSlashes);
route.get('/slash/search', authMiddleware, searchSlash);
route.post('/slash/', authMiddleware, createSlash);
route.get('/slash/:id', authMiddleware, fetchSlash);
route.post('/slash/:id', authMiddleware, joinSlash);
route.put('/slash/:id', authMiddleware, editSlash);
route.patch('/slash/:id', authMiddleware, leaveSlash);
route.delete('/slash/:id', authMiddleware, deleteSlash);

route.get('/slash/qr/:id', authMiddleware, getQrForSlash);
route.post('/slash/v/qr', authMiddleware, verifyQr);
route.post('/slash/claim', authMiddleware, verifyQr);

export default route;
