import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import {
  fetchProducts,
  addProducts,
  changeProductStatus,
} from '../controllers/product/productControllers';

const route = Router();

// Public route - anyone can fetch products
route.get('/products', fetchProducts);

// Admin only routes
route.post('/products', authMiddleware, requireRole('admin'), addProducts);
route.put('/products/status', authMiddleware, requireRole('admin'), changeProductStatus);

export default route;
