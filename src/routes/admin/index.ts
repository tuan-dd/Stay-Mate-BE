import {
  catchError,
  checkParamsId,
  checkRole,
  checkUser,
  validateRequest,
} from '@/middleware/validate';
import { Role } from '@/models/User';
import {} from '@/schema/hotel.schema';
import {
  queryUserSchema,
  updateUserByAdminSchema,
  updateHotelByAdminSchema,
} from '@/schema/admin.schema';
import express from 'express';
import adminController from '@/controllers/admin.controller';

const router = express.Router();

router.use(checkUser);
router.use(checkRole(Role.ADMIN));

router.get(
  '/',
  validateRequest(queryUserSchema),
  catchError(adminController.queryUsers),
);

router.get('/:id', checkParamsId, catchError(adminController.detailUser));

router.put(
  '/user/:id',
  checkParamsId,
  validateRequest(updateUserByAdminSchema),
  catchError(adminController.updateByAdmin),
);

router.put(
  '/hotel/:id',
  checkParamsId,
  validateRequest(updateHotelByAdminSchema),
  catchError(adminController.updateHotelByAdmin),
);

export default router;
