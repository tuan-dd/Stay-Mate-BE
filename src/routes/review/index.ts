import reviewController from '@/controllers/review.controller';
import {
  catchError,
  checkParamsId,
  checkUser,
  validateRequest,
} from '@/middleware/validate';
import {
  createReviewSchema,
  getReviewsByUserSchema,
  getReviewsSchema,
} from '@/schema/review.schema';

import express from 'express';
const router = express.Router();

/**
 * @create review (parent, children)
 * @update author review (parent)
 * @get    get review hotels or review of children
 */

router.get(
  '/',
  validateRequest(getReviewsSchema),
  catchError(reviewController.getReviews),
);

router.use(checkUser);

router.get(
  '/user',
  validateRequest(getReviewsByUserSchema),
  catchError(reviewController.getReviewsByUser),
);

router.post(
  '/:id',
  checkParamsId,
  validateRequest(createReviewSchema),
  catchError(reviewController.createReview),
);

router.put(
  '/:id',
  checkParamsId,
  validateRequest(getReviewsSchema),
  catchError(reviewController.updateReview),
);

export default router;
