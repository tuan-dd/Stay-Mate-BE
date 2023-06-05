import hotelController from '@/controllers/hotel.controller';
import {
  catchError,
  checkParamsId,
  checkRole,
  checkUser,
  validateRequest,
} from '@/middleware/validate';
import { ERole } from '@/models/User';
import {
  createRoomSchema,
  createHotelSchema,
  getHotelSchema,
  updateHotelSchema,
  updateRoomSchema,
  getDetailSchema,
  checkHotelSchema,
} from '@/schema/hotel.schema';
import express from 'express';
const router = express.Router();

router.get('/', validateRequest(getHotelSchema), catchError(hotelController.getHotels));

router.get(
  '/:id',
  checkParamsId,
  validateRequest(getDetailSchema),
  catchError(hotelController.detailHotel),
);

router.get(
  '/option/check',
  validateRequest(checkHotelSchema),
  catchError(hotelController.checkRoomsAvailable),
);

router.post(
  '/create-hotel',
  validateRequest(createHotelSchema),
  checkUser,
  catchError(hotelController.createHotel),
);

// hotelier can use router

router.get(
  '/hotelier/me',
  checkUser,
  checkRole(ERole.HOTELIER),
  catchError(hotelController.getHotelsByHotelier),
);

router.put(
  '/update-hotel/:id',
  checkParamsId,
  validateRequest(updateHotelSchema),
  checkUser,
  checkRole(ERole.HOTELIER),
  catchError(hotelController.updateHotel),
);

router.post(
  '/create-room/:id',
  checkParamsId,
  validateRequest(createRoomSchema),
  checkUser,
  checkRole(ERole.HOTELIER),
  catchError(hotelController.createRoom),
);

router.put(
  '/update-room/:id',
  checkParamsId,
  checkUser,
  validateRequest(updateRoomSchema),
  checkRole(ERole.HOTELIER),
  catchError(hotelController.updateRoomType),
);
export default router;
