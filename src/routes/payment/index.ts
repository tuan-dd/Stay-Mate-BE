import paymentController from '@/controllers/payment.controller';
import { catchError, checkUser, validateRequest } from '@/middleware/validate';
import {
  createBookingSchema,
  paymentBookingSchema,
  paymentMembershipSchema,
  withdrawSchema,
} from '@/schema/payment.schema';
import express from 'express';
const router = express.Router();

/**
 * @payment atomic
 * @
 */

router.use(checkUser);

router.post(
  '/create-booking',
  validateRequest(createBookingSchema),
  catchError(paymentController.createBooking),
);

router.put(
  '/payment-booking',
  validateRequest(paymentBookingSchema),
  catchError(paymentController.paymentBooking),
);

router.put(
  '/cannel-booking',
  validateRequest(paymentBookingSchema),
  catchError(paymentController.paymentBooking),
);

router.put(
  '/charge',
  validateRequest(paymentBookingSchema),
  catchError(paymentController.paymentBooking),
);

router.put(
  '/withdraw',
  validateRequest(withdrawSchema),
  catchError(paymentController.withdrawMoney),
);

router.put(
  '/payment-membership',
  validateRequest(paymentMembershipSchema),
  catchError(paymentController.withdrawMoney),
);

router.get('/booking', catchError(paymentController.getBookings));
router.get('/membership', catchError(paymentController.getMemberShips));

export default router;
