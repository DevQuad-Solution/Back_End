import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import {
  fetchProducts,
  addProducts,
  changeProductStatus,
} from '../controllers/product/productControllers';
import { productRateLimit } from '../middlewares/rateLimiter';

const route = Router();

// Apply product-specific rate limits
route.use(productRateLimit);

// Public route - anyone can fetch products
route.get('/products', fetchProducts);

// Admin only routes
route.post('/products', authMiddleware, requireRole('admin'), addProducts);
route.put('/products/status', authMiddleware, requireRole('admin'), changeProductStatus);

export default route;
