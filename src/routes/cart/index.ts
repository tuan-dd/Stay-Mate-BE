import cartController from '@/controllers/cart.controller';
import { catchError, checkUser, validateRequest } from '@/middleware/validate';
import { createCartSchema } from '@/schema/cart.schema';
import express from 'express';

const router = express.Router();

router.use(checkUser);

router.post(
  '/',
  validateRequest(createCartSchema),
  catchError(cartController.createOrAddToCart),
);

router.put(
  '/',
  validateRequest(createCartSchema),
  catchError(cartController.updateOrder),
);

router.get('/', catchError(cartController.getCarts));

export default router;
