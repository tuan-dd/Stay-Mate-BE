import paymentController from '@/controllers/payment.controller';
import { catchError, checkUser, validateRequest } from '@/middleware/validate';
import {
  cancelBookingSchema,
  chargeSchema,
  createBookingSchema,
  getBookingSchema,
  getMembershipSchema,
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
  '/cancel-booking',
  validateRequest(cancelBookingSchema),
  catchError(paymentController.cancelBooking),
);

router.put(
  '/charge',
  validateRequest(chargeSchema),
  catchError(paymentController.chargeMoney),
);

router.put(
  '/withdraw',
  validateRequest(withdrawSchema),
  catchError(paymentController.withdrawMoney),
);

router.put(
  '/payment-membership',
  validateRequest(paymentMembershipSchema),
  catchError(paymentController.paymentMembership),
);

router.get(
  '/booking',
  validateRequest(getBookingSchema),
  catchError(paymentController.getBookings),
);
router.get(
  '/membership',
  validateRequest(getMembershipSchema),
  catchError(paymentController.getMemberShips),
);

export default router;
