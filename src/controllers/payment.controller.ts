import {
  BadRequestError,
  CreatedResponse,
  ForbiddenError,
  NotFoundError,
  SuccessResponse,
} from '@/helpers/utils';
import { EKeyHeader } from '@/middleware/validate';
import { IBooking, EStatus } from '@/models/Booking';
import { Package, PricePackage } from '@/models/Hotel';
import { IMembership } from '@/models/Membership';
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
import { bookingService, memberShipService } from '@/services/payment.service';
import userService from '@/services/user.service';
import { EJob } from '@/utils/jobs';
import { deleteKeyUndefined, getDeleteFilter } from '@/utils/lodashUtil';
import dayjs from 'dayjs';
import { Response, Request } from 'express';
import mongoose, { ClientSession, Types } from 'mongoose';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import redisUtil from '@/utils/redisUtil';

dayjs.extend(utc);
dayjs.extend(timezone);
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
        roomTypeId: new mongoose.Types.ObjectId(room.roomTypeId),
      })),
      userId: new mongoose.Types.ObjectId(req.headers[EKeyHeader.USER_ID] as string),
      hotelId: new mongoose.Types.ObjectId(req.body.hotelId),
      startDate: dayjs(req.body.startDate)
        .tz('Asia/Ho_Chi_Minh')
        .set('hour', 12)
        .set('minute', 0)
        .toDate(),
      endDate: dayjs(req.body.endDate)
        .tz('Asia/Ho_Chi_Minh')
        .set('hour', 12)
        .set('minute', 0)
        .toDate(),
      duration: 1000 * 60 * 10,
    };

    const userDb = await userService.findById(newBooking.userId);
    const roomsOrders = newBooking.rooms;

    const NumberOfRoomAfterCheck = await bookingService.isEnoughRoom(
      newBooking,
      newBooking.rooms,
    );

    if (!NumberOfRoomAfterCheck) throw new BadRequestError('Out of room');
    // tại đây loop qua để tính tổng tiền
    let total = 0;
    const roomsResults = [];
    NumberOfRoomAfterCheck.roomTypeIds.forEach((hotelDbRoom) => {
      roomsOrders.forEach((roomOrder) => {
        if (roomOrder.roomTypeId.equals(hotelDbRoom._id)) {
          // lấy tên phòng và số lượng để trả res
          const roomResult = {
            nameOfRoom: hotelDbRoom.nameOfRoom,
            quantity: roomOrder.quantity,
          };
          roomsResults.push(roomResult);
          total += roomOrder.quantity * hotelDbRoom.price;
        }
      });
    });

    newBooking.total =
      total *
      Math.ceil(
        (dayjs(newBooking.endDate).unix() - dayjs(newBooking.startDate).unix()) /
          (60 * 60 * 24),
      );

    if (newBooking.total > userDb.account.balance)
      throw new BadRequestError('You don`t enough money to booking');

    // ngày đầu trừ ngày cuối để tính tổng số ngày ở nhân tổng tiền số lượng phòng

    const createBooking = await bookingService.createOne(newBooking);

    await addJobToQueue(
      {
        type: EJob.BOOKING_DECLINE,
        job: { id: createBooking._id.toHexString() },
      },
      { delay: 1000 * 60 * 10, removeOnComplete: true, removeOnFail: true },
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
      bookingId: new Types.ObjectId(req.body.bookingId),
      password: req.body.password,
      hotelId: new Types.ObjectId(req.body.hotelId),
    };
    const userId = new Types.ObjectId(req.headers[EKeyHeader.USER_ID] as string);

    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      const bookingDb = await bookingService.findOne(
        {
          _id: newPayment.bookingId,
          userId,
          hotelId: newPayment.hotelId,
        },
        null,
        { lean: false },
      );

      if (!bookingDb) throw new NotFoundError('Not found payment');

      if (bookingDb.status !== EStatus.PENDING)
        throw new BadRequestError('Payment expired');

      const userDb = await userService.findByIdAndCheckPass(userId, newPayment.password);

      if (typeof userDb === 'boolean')
        throw new ForbiddenError('Can`t payment, wrong password');

      if (userDb.account.balance < bookingDb.total)
        throw new ForbiddenError('Balance less than booking');

      const hotel = await hotelsService.findById(newPayment.hotelId);

      const hotelierDb = await userService.findByIdUpdate(
        hotel.userId,
        {
          $inc: { 'account.virtualBalance': bookingDb.total },
        },
        { session },
      );

      if (!hotelierDb) throw new NotFoundError('Not found Hotelier');

      userDb.account.balance = userDb.account.balance - bookingDb.total;

      await userDb.save({ session });

      bookingDb.status = EStatus.SUCCESS;

      await bookingDb.save({ session });

      const nowDate = dayjs().tz('Asia/Ho_Chi_Minh').valueOf();
      const endDate = dayjs(bookingDb.endDate).valueOf();

      // const promise = new Promise((resolve, _reject) => {
      //   setTimeout(resolve, 10000);
      // });

      // await promise;

      const createJob = await addJobToQueue(
        {
          type: EJob.BOOKING_STAY,
          job: { id: bookingDb._id.toHexString() },
        },
        {
          delay: endDate - nowDate,
          removeOnComplete: true,
        },
      );

      if (!createJob) throw new BadRequestError('Can`t payment, try again ');

      await session.commitTransaction();

      const countBookingsByHotel = await redisUtil.get(
        `countBookings:${req.body.hotelId}`,
      );

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
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  };

  cancelBooking = async (req: Request<any, any, CancelBookingSchema>, res: Response) => {
    const cancelPayment = {
      bookingId: new Types.ObjectId(req.body.bookingId),
      hotelId: new Types.ObjectId(req.body.hotelId),
    };
    const userId = req.headers[EKeyHeader.USER_ID] as string;

    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();
    try {
      const bookingDb = await bookingService.findById(cancelPayment.bookingId, null, {
        lean: false,
      });

      if (!bookingDb) throw new NotFoundError('Not found payment');

      if (bookingDb.status !== EStatus.SUCCESS)
        throw new NotFoundError('User cant refund');

      const dataNow = dayjs().tz('Asia/Ho_Chi_Minh').valueOf();

      if (bookingDb.startDate.getTime() - 1000 * 60 * 60 * 12 < dataNow)
        throw new BadRequestError('Overdue to cancel, you only cant cancel before 12h');

      if (userId !== bookingDb.userId.toHexString())
        throw new NotFoundError('Not found Booking');

      const hotelDb = await hotelsService.findById(cancelPayment.hotelId);

      const hotelierDb = await userService.findByIdUpdate(
        hotelDb.userId,
        {
          $inc: { 'account.virtualBalance': -bookingDb.total },
        },
        { session },
      );

      if (!hotelierDb) throw new NotFoundError('Not found Hotelier');

      await userService.findByIdUpdate(
        userId,
        {
          $inc: { 'account.balance': bookingDb.total },
        },
        { session },
      );

      bookingDb.status = EStatus.CANCEL;

      await bookingDb.save({ session });

      await session.commitTransaction();

      const countBookingsByHotel = await redisUtil.get(
        `countBookings:${req.body.hotelId}`,
      );

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
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  };

  paymentMembership = async (
    req: Request<any, any, PaymentMembershipSchema>,
    res: Response,
  ) => {
    const userId = req.headers[EKeyHeader.USER_ID] as string;
    const newMemberShip: IMembership = {
      userId: new Types.ObjectId(userId),
      package: req.body.package,
    };

    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      const userDb = await userService.findByIdAndCheckPass(userId, req.body.password);

      if (typeof userDb === 'boolean') throw new BadRequestError('Wrong Password');

      if (userDb.account.balance < PricePackage[newMemberShip.package])
        throw new ForbiddenError('Balance less than package');

      const membershipsOfUser = await memberShipService.findMany({
        query: { userId: new Types.ObjectId(userId), isExpire: false },
        page: null,
        limit: null,
      });

      if (membershipsOfUser.length !== 0) {
        // lấy ngày kết thúc của các gói chưa hết hạn mới nhất làm ngày bắt đầu của gói mới
        newMemberShip.timeStart = dayjs(membershipsOfUser[0].timeEnd)
          .tz('Asia/Ho_Chi_Minh')
          .toDate();
      } else {
        // nếu chưa có thì bằng ngày hôm nay
        newMemberShip.timeStart = dayjs().tz('Asia/Ho_Chi_Minh').toDate();
      }

      // Cho giá tiền của gói bằng thời số ngày theo tuần tháng năm
      newMemberShip.timeEnd = new Date(
        dayjs(newMemberShip.timeStart).tz('Asia/Ho_Chi_Minh').valueOf() +
          1000 * 60 * 60 * 24 * PricePackage[newMemberShip.package],
      );

      const createMemberShip = await memberShipService.createOneAtomic([newMemberShip], {
        session,
      });
      if (newMemberShip.package === Package.WEEK)
        await hotelsService.updateMany(
          {
            userId: newMemberShip.userId,
            package: Package.FREE,
            isDelete: false,
          },
          { $set: { package: newMemberShip.package } },
          { session },
        );
      else if (newMemberShip.package === Package.MONTH) {
        await hotelsService.updateMany(
          {
            userId: newMemberShip.userId,
            package: Package.WEEK,
            isDelete: false,
          },
          { $set: { package: newMemberShip.package } },
          { session },
        );
      } else {
        await hotelsService.updateMany(
          {
            userId: newMemberShip.userId,
            isDelete: false,
          },
          { $set: { package: newMemberShip.package } },
          { session },
        );
      }

      // Cho giá tiền của gói bằng thời số ngày theo tuần tháng năm
      userDb.account.balance =
        userDb.account.balance - PricePackage[newMemberShip.package];

      await userDb.save({ session });

      // newMemberShip.timeEnd.getTime() - dayjs().tz('Asia/Ho_Chi_Minh').valueOf()
      const createJob = await addJobToQueue(
        {
          type: EJob.MEMBERSHIP,
          job: { id: createMemberShip[0]._id, userID: userId },
        },
        {
          delay:
            newMemberShip.timeEnd.getTime() - dayjs().tz('Asia/Ho_Chi_Minh').valueOf(),
        },
      );

      if (!createJob) throw new BadRequestError('Can`t payment, try again ');

      await session.commitTransaction();
      new CreatedResponse({
        message: 'Payment membership successfully',
        data: createMemberShip[0],
      }).send(res);
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  };

  chargeMoney = async (req: Request<any, any, ChargeSchema>, res: Response) => {
    const balance = req.body.balance;
    const userId = req.headers[EKeyHeader.USER_ID] as string;

    const updateBalance = await userService.findByIdUpdate(
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
      data: updateBalance.account.balance,
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
    const userId = new Types.ObjectId(req.headers[EKeyHeader.USER_ID] as string);

    query = getDeleteFilter(['page'], req.query);

    query = deleteKeyUndefined(query);

    const page = req.query.page || 1;

    const memberships = await memberShipService.findMany({
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
    const userId = new Types.ObjectId(req.headers[EKeyHeader.USER_ID] as string);
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
    const userId = new Types.ObjectId(req.headers[EKeyHeader.USER_ID] as string);
    const hotelId = new Types.ObjectId(query.hotelId);
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
    const userId = new Types.ObjectId(req.headers[EKeyHeader.USER_ID] as string);
    const bookingId = new Types.ObjectId(req.params.id);

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

  getCountBookingByHolier = async (
    req: Request<any, any, any, GetBookingByHotelierSchema>,
    res: Response,
  ) => {
    const userId = new Types.ObjectId(req.headers[EKeyHeader.USER_ID] as string);
    const hotelId = new Types.ObjectId(req.query.hotelId);

    if (!req.query.allHotel) {
      const countBookingsRedis = await redisUtil.get(`countBookings:${hotelId}`);
      if (!countBookingsRedis) {
        const countBookings = await bookingService.getCountByQuery({
          status: EStatus.SUCCESS,
          hotelId,
        });

        if (countBookings >= 0) {
          await redisUtil.set(`countBookings:${hotelId}`, countBookings, {
            EX: 60 * 60 * 10,
          });
        }
        return oke(countBookings);
      }

      return oke(parseInt(countBookingsRedis, 10));
    }
    const hotelsDb = await hotelsService.findMany({
      query: { userId, isDelete: false },
      page: null,
      limit: null,
    });

    const hotelsId = hotelsDb.map((hotel) => hotel._id.toString());

    const result = await Promise.all<number>(
      hotelsId.map(async (id) => {
        const countBooking = await redisUtil.get(`countBookings:${id}`);
        if (countBooking) {
          return parseInt(countBooking);
        }
        const countBookingDb = await bookingService.getCountByQuery({
          status: EStatus.SUCCESS,
          id,
        });

        await redisUtil.set(`countBookings:${id}`, countBookingDb, {
          EX: 60 * 60 * 10,
        });

        return countBookingDb;
      }),
    );

    const countBookings = result.reduce((pre, cur) => pre + cur);

    oke(countBookings);

    function oke(count: any | any[]) {
      if ((!count && count !== 0) || count < 0) {
        throw new BadRequestError('Not found count bookings');
      }
      new CreatedResponse({
        message: 'Get count Bookings successfully',
        data: { count },
      }).send(res);
    }
  };
}

const paymentController = new PaymentController();

export default paymentController;

// jest => unit test
// liet ke test cases cho 1 function cần test:
// - ko đủ balance
// - dư balance
// - vừa khớp balance

// mock/mocking
// const mockDb = jest.mock();

// e2e (end-to-end) testing
// e2e cho postman
// cho 1 api => define posibility input pairs
// e2e cho expressjs

// QC define test cases cho function/feature
// - ko đủ balance
// - dư balance
// - vừa khớp balance
