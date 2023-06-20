import {
  BadRequestError,
  CreatedResponse,
  ForbiddenError,
  NotFoundError,
  SuccessResponse,
} from '@/helpers/utils';
import { EKeyHeader } from '@/middleware/validate';
import { IBooking } from '@/models/Booking';
import addJobToQueue from '@/queue/queue';
import {
  CancelBookingSchema,
  ChargeSchema,
  CreateBookingSchema,
  GetBookingByHotelierSchema,
  GetBookingSchema,
  GetMembershipSchema,
  PaymentBookingSchema,
  PaymentMembershipSchema,
  WithdrawSchema,
  getMembershipSchema,
} from '@/schema/payment.schema';
import cartService from '@/services/cart.service';
import hotelsService from '@/services/hotels.service';
import bookingService from '@/services/payment.service';
import userService from '@/services/user.service';
import { EJob } from '@/utils/jobs';
import {
  convertDate,
  convertStringToObjectId,
  deleteKeyUndefined,
  getDeleteFilter,
} from '@/utils/otherUtil';
import { Response, Request } from 'express';
import mongoose, { ClientSession } from 'mongoose';
import redisUtil from '@/utils/redisUtil';
import membershipService from '@/services/membership.service';

class PaymentController {
  createBooking = async (req: Request<any, any, CreateBookingSchema>, res: Response) => {
    /**
     * @check khách sạn có loai phòng đó k
     * @check
     * @create tao booking lưu booking id và bullmq
     * @remove order
     */

    const newBooking: IBooking = {
      rooms: req.body.rooms.map((room) => ({
        quantity: room.quantity,
        roomTypeId: convertStringToObjectId(room.roomTypeId),
      })),
      userId: req.userId,
      hotelId: convertStringToObjectId(req.body.hotelId),
      startDate: convertDate(req.body.startDate, 12),
      endDate: convertDate(req.body.endDate, 12),
      duration: 1000 * 60 * 10,
    };

    const createBooking = await bookingService.createBooking(newBooking);

    await addJobToQueue(
      {
        type: EJob.BOOKING_DECLINE,
        job: { id: createBooking._id.toHexString() },
      },
      { removeOnComplete: true, delay: 1000 * 60 * 10, removeOnFail: true },
    );

    // If have in cart , remove when  create booking successfully
    if (req.body.createdAt)
      await cartService.findOneUpdate(
        { userId: newBooking.userId },
        {
          $pull: {
            orders: {
              createdAt: req.body.createdAt,
            },
          },
        },
      );

    new CreatedResponse({
      message: 'Create booking successfully',
      data: createBooking,
    }).send(res);
  };

  paymentBooking = async (
    req: Request<any, any, PaymentBookingSchema>,
    res: Response,
  ) => {
    const newPayment = {
      bookingId: convertStringToObjectId(req.body.bookingId),
      password: req.body.password,
      hotelId: convertStringToObjectId(req.body.hotelId),
    };
    const { userId } = req;

    await bookingService.paymentBooking(userId, newPayment);

    const countBookingsByHotel = await redisUtil.get(`countBookings:${req.body.hotelId}`);

    if (countBookingsByHotel && parseInt(countBookingsByHotel, 10) >= 0) {
      await redisUtil.set(
        `countBookings:${req.body.hotelId}`,
        parseInt(countBookingsByHotel, 10) + 1,
        { EX: 60 * 60 * 10 },
      );
    }

    new SuccessResponse({
      message: 'Payment Booking successfully',
    }).send(res);
  };

  cancelBooking = async (req: Request<any, any, CancelBookingSchema>, res: Response) => {
    const cancelPayment = {
      bookingId: convertStringToObjectId(req.body.bookingId),
      hotelId: convertStringToObjectId(req.body.hotelId),
    };
    const userId = req.userId;

    await bookingService.cancelBooking(userId, cancelPayment);

    const countBookingsByHotel = await redisUtil.get(`countBookings:${req.body.hotelId}`);

    if (countBookingsByHotel && parseInt(countBookingsByHotel, 10) > 0) {
      await redisUtil.set(
        `countBookings:${req.body.hotelId}`,
        parseInt(countBookingsByHotel, 10) - 1,
        { EX: 60 * 60 * 10 },
      );
    }

    new SuccessResponse({
      message: 'Cancel Booking successfully',
    }).send(res);
  };

  paymentMembership = async (
    req: Request<any, any, PaymentMembershipSchema>,
    res: Response,
  ) => {
    const userId = req.userId;

    const createMemberShip = await membershipService.createMembership(
      userId,
      req.body.package,
      req.body.package,
    );

    new CreatedResponse({
      message: 'Payment membership successfully',
      data: createMemberShip,
    }).send(res);
  };

  chargeMoney = async (req: Request<any, any, ChargeSchema>, res: Response) => {
    const balance = req.body.balance;
    const userId = req.headers[EKeyHeader.USER_ID] as string;

    await userService.findByIdUpdate(
      userId,
      {
        $inc: { 'account.balance': balance },
      },
      {
        new: true,
      },
    );

    new SuccessResponse({
      message: 'charge successfully',
    }).send(res);
  };

  withdrawMoney = async (req: Request<any, any, WithdrawSchema>, res: Response) => {
    const userId = req.headers[EKeyHeader.USER_ID] as string;
    const newUpdate = req.body;

    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();
    try {
      const userDb = await userService.findByIdAndCheckPass(userId, req.body.password);

      if (typeof userDb === 'boolean') throw new BadRequestError('Wrong Password');

      if (userDb.account.balance < newUpdate.withdraw)
        throw new ForbiddenError('Balance less than withdraw');

      userDb.account.balance = userDb.account.balance - newUpdate.withdraw;

      await userDb.save({ session });

      await session.commitTransaction();

      new CreatedResponse({
        message: 'withdraw successfully',
      }).send(res);
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  };

  getMemberShips = async (
    req: Request<any, any, any, GetMembershipSchema>,
    res: Response,
  ) => {
    let query = getMembershipSchema.cast(req, {
      stripUnknown: true,
    }).query;
    const userId = req.userId;

    query = getDeleteFilter(['page'], req.query);

    query = deleteKeyUndefined(query);

    const page = req.query.page || 1;

    const memberships = await membershipService.findMany({
      query: { ...query, userId },
      page: page,
      limit: 10,
    });

    if (!memberships.length) throw new NotFoundError('Not found memberships');

    new CreatedResponse({
      message: 'Get data`s MemberShips successfully',
      data: memberships,
    }).send(res);
  };

  getBookings = async (req: Request<any, any, any, GetBookingSchema>, res: Response) => {
    const userId = req.userId;
    const page = req.query.page || 1;

    const bookings = await bookingService.findManyAndPopulateByQuery(
      {
        query: { status: req.query.status, userId },
        page: page,
        limit: 10,
      },
      { path: 'hotelId', select: 'hotelName country city star starRating' },
      { path: 'rooms.roomTypeId', select: 'price nameOfRoom numberOfRoom' },
    );

    if (!bookings.length) throw new NotFoundError('Not found booking');

    const countBookings = await bookingService.getCountByQuery({
      status: req.query.status,
      userId,
    });

    new CreatedResponse({
      message: 'Get data`s Bookings successfully',
      data: { bookings, count: countBookings },
    }).send(res);
  };

  getBookingsByHotelier = async (
    req: Request<any, any, any, GetBookingByHotelierSchema>,
    res: Response,
  ) => {
    const query = req.query;
    const userId = req.userId;
    const hotelId = convertStringToObjectId(query.hotelId);
    const page = req.query.page || 1;

    if (query.allHotel) {
      const hotelsDb = await hotelsService.findMany(
        {
          query: { userId, isDelete: false },
          page: null,
          limit: null,
        },
        '_id',
      );

      if (!hotelsDb.length) throw new NotFoundError('Not found hotel');

      const bookings = await bookingService.findManyAndPopulateByHotelier(
        {
          query: { status: req.query.status, hotelId: { $in: hotelsDb } },
          page: page,
          limit: 10,
        },
        { path: 'hotelId', select: 'hotelName country city star starRating' },
        { path: 'rooms.roomTypeId', select: 'price nameOfRoom numberOfRoom' },
      );

      if (!bookings.length) throw new NotFoundError('Not found booking');

      const countBookings = await bookingService.getCountByQuery({
        status: req.query.status,
        hotelId: { $in: hotelsDb },
      });

      return new CreatedResponse({
        message: 'Get data`s Bookings successfully',
        data: {
          bookings,
          count: countBookings,
        },
      }).send(res);
    }

    const hotelDb = await hotelsService.findOne({
      _id: hotelId,
      userId,
      isDelete: false,
    });

    if (!hotelDb) throw new NotFoundError('Not found hotel');

    const bookings = await bookingService.findManyAndPopulateByHotelier(
      {
        query: { status: req.query.status, hotelId },
        page: page,
        limit: 10,
      },
      { path: 'hotelId', select: 'hotelName country city star starRating' },
      { path: 'rooms.roomTypeId', select: 'price nameOfRoom numberOfRoom' },
    );

    if (!bookings.length) throw new NotFoundError('Not found booking');

    const countBookings = await bookingService.getCountByQuery({
      status: req.query.status,
      hotelId,
    });

    new CreatedResponse({
      message: 'Get data`s Bookings successfully',
      data: {
        bookings,
        count: countBookings,
      },
    }).send(res);
  };

  getDetailBooking = async (req: Request, res: Response) => {
    const userId = req.userId;
    const bookingId = convertStringToObjectId(req.params.id);

    const booking = await bookingService.findOneByPopulate(
      { _id: bookingId, userId },
      null,
      { path: 'hotelId', select: 'hotelName country city star starRating' },
      { path: 'rooms.roomTypeId', select: 'price nameOfRoom numberOfRoom' },
    );

    if (!booking) throw new NotFoundError('Not found booking');

    new CreatedResponse({
      message: 'Get data`s Bookings successfully',
      data: booking,
    }).send(res);
  };
}

const paymentController = new PaymentController();

export default paymentController;

// jest => unit test
// liệt kê test cases cho 1 function cần test:
// - ko đủ balance
// - dư balance
// - vừa khớp balance

// mock/mocking
// const mockDb = jest.mock();

// e2e (end-to-end) testing
// e2e cho postman
// cho 1 api => define possibility input pairs
// e2e cho express js

// QC define test cases cho function/feature
// - ko đủ balance
// - dư balance
// - vừa khớp balance
