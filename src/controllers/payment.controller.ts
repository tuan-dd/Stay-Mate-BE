import {
  BadRequestError,
  CreatedResponse,
  ForbiddenError,
  NotFoundError,
  SuccessResponse,
} from '@/helpers/utils';
import { KeyHeader } from '@/middleware/validate';
import { IBooking, Status } from '@/models/Booking';
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
import { getConvertCreatedAt, getDeleteFilter, getFilterData } from '@/utils/lodashUtil';
import { Response, Request } from 'express';
import mongoose, { ClientSession, Types } from 'mongoose';

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
      userId: new mongoose.Types.ObjectId(req.headers[KeyHeader.USER_ID] as string),
      hotelId: new mongoose.Types.ObjectId(req.body.hotelId),
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      duration: 1000 * 60 * 10,
    };

    const roomsOrders = newBooking.rooms;

    const NumberOfRoomAfterCheck = await bookingService.isEnoughRoom(
      newBooking,
      roomsOrders.map((room) => room.roomTypeId),
    );

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
    newBooking.total = total;

    const createBooking = await bookingService.createOne(newBooking);

    await addJobToQueue(
      {
        type: EJob.BOOKING_DECLINE,
        job: { id: createBooking._id.toHexString() },
      },
      { removeOnComplete: true, delay: 1000 * 60 * 5, removeOnFail: true },
    );

    // If have in cart , remove when  create booking successfully
    await cartService.findOneUpdate(
      { userId: newBooking.userId },
      {
        $pull: {
          orders: {
            hotelId: newBooking.hotelId,
            startDate: req.body.startDate,
            endDate: req.body.endDate,
          },
        },
      },
    );

    new CreatedResponse({
      message: 'Create booking successfully',
      data: {
        ...getFilterData(['total', 'startDate', 'endDate', '_id'], createBooking),
        rooms: roomsResults,
        hotel: NumberOfRoomAfterCheck.hotelName,
      },
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
    const userId = req.headers[KeyHeader.USER_ID] as string;

    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      const bookingDb = await bookingService.findOne(
        {
          _id: newPayment.bookingId,
          hotelId: newPayment.hotelId,
        },
        null,
        { lean: false },
      );

      if (!bookingDb) throw new NotFoundError('Not found payment');

      if (bookingDb.status !== Status.PENDING)
        throw new BadRequestError('Payment expired');

      const userDb = await userService.findByIdAndCheckPass(userId, newPayment.password);

      if (typeof userDb === 'boolean')
        throw new ForbiddenError('can`t payment, try again');

      if (userDb.account.balance < bookingDb.total)
        throw new ForbiddenError('balance less than booking');

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

      bookingDb.status = Status.SUCCESS;

      await bookingDb.save({ session });

      const createJob = await addJobToQueue(
        {
          type: EJob.BOOKING_STAY,
          job: { id: bookingDb._id.toHexString() },
        },
        {
          delay: bookingDb.startDate.getTime(),
          removeOnComplete: true,
        },
      );

      if (!createJob) throw new BadRequestError('can`t payment, try again ');

      await session.commitTransaction();

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
    const userId = req.headers[KeyHeader.USER_ID] as string;

    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();
    try {
      const bookingDb = await bookingService.findById(cancelPayment.bookingId, null, {
        lean: false,
      });

      if (!bookingDb) throw new NotFoundError('Not found payment');

      if (bookingDb.status !== Status.SUCCESS)
        throw new NotFoundError('User cant refund');

      const dataNow = new Date().getTime();

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

      bookingDb.status = Status.CANCEL;

      await bookingDb.save({ session });

      await session.commitTransaction();

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
    const userId = req.headers[KeyHeader.USER_ID] as string;
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

      if (membershipsOfUser.length) {
        // lấy ngày kết thúc của các gói chưa hết hạn làm ngày bắt đầu của gói mới
        newMemberShip.timeStart = new Date(
          membershipsOfUser
            .map((membership) => membership.timeEnd)
            .sort((a, b) => a.getTime() - b.getTime())
            .at(-1),
        );
      } else {
        // nếu chưa có thì bằng ngày hôm nay
        newMemberShip.timeStart = new Date();
      }

      // Cho giá tiền của gói bằng thời số ngày theo tuần tháng năm
      newMemberShip.timeEnd = new Date(
        newMemberShip.timeStart.getTime() +
          1000 * 60 * 60 * 24 * PricePackage[newMemberShip.package],
      );

      const createMemberShip = await memberShipService.createOneAtomic([newMemberShip], {
        session,
      });
      if (newMemberShip.package === Package.WEEK)
        await hotelsService.findOneUpdate(
          {
            userId: newMemberShip.userId,
            package: Package.FREE,
            isDelete: false,
          },
          { $set: { package: newMemberShip.package } },
          { session },
        );
      else if (newMemberShip.package === Package.MONTH) {
        await hotelsService.findOneUpdate(
          {
            userId: newMemberShip.userId,
            package: Package.WEEK,
            isDelete: false,
          },
          { $set: { package: newMemberShip.package } },
          { session },
        );
      } else {
        await hotelsService.findOneUpdate(
          {
            userId: newMemberShip.userId,
            isDelete: false,
          },
          { $set: { package: newMemberShip.package } },
          { session },
        );
      }

      userDb.account.balance =
        userDb.account.balance - PricePackage[newMemberShip.package];

      await userDb.save({ session });

      const createJob = await addJobToQueue(
        {
          type: EJob.MEMBERSHIP,
          job: { id: createMemberShip[0]._id, userID: userId },
        },
        { delay: newMemberShip.timeEnd.getTime() },
      );

      if (!createJob) throw new BadRequestError('Can`t payment, try again ');

      await session.commitTransaction();
      new CreatedResponse({
        message: 'Payment membership successfully',
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
    const userId = req.headers[KeyHeader.USER_ID] as string;

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
    const userId = req.headers[KeyHeader.USER_ID] as string;
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
    const userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);

    query = getDeleteFilter(['page'], req.query);

    query = getConvertCreatedAt(query, ['']);

    const page = req.query.page || 1;

    const memberships = await memberShipService.findMany({
      query: { ...query, userId },
      page: page,
      limit: 10,
    });

    new CreatedResponse({
      message: 'Get data`s MemberShips successfully',
      data: memberships,
    }).send(res);
  };

  getBookings = async (req: Request<any, any, any, GetBookingSchema>, res: Response) => {
    const userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);
    const page = req.query.page || 1;

    const bookings = await bookingService.findManyAndPopulateByQuery(
      {
        query: { status: req.query.status, userId },
        page: page,
        limit: 10,
      },
      { path: 'hotelId', select: 'hotelName country city star starRating' },
      { path: 'rooms.roomTypeId', select: 'price -_id nameOfRoom' },
    );

    if (!bookings.length) throw new NotFoundError('Not found booking');

    new CreatedResponse({
      message: 'Get data`s Bookings successfully',
      data: bookings,
    }).send(res);
  };

  getBookingsByHotelier = async (
    req: Request<any, any, any, GetBookingByHotelierSchema>,
    res: Response,
  ) => {
    const query = req.query;
    const userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);
    const hotelId = new Types.ObjectId(query.hotelId);
    const page = req.query.page || 1;

    if (query.status === Status.PENDING)
      throw new BadRequestError('Hotelier can not get pending booking');

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

      const bookings = await bookingService.findManyAndPopulateByQuery(
        {
          query: { status: req.query.status, hotelId: { $in: hotelsDb } },
          page: page,
          limit: 10,
        },
        { path: 'hotelId', select: 'hotelName country city star starRating' },
        { path: 'rooms.roomTypeId', select: 'price -_id nameOfRoom' },
      );

      if (!bookings.length) throw new NotFoundError('Not found booking');

      return new CreatedResponse({
        message: 'Get data`s Bookings successfully',
        data: bookings,
      }).send(res);
    }

    const hotelDb = await hotelsService.findOne({
      _id: hotelId,
      userId,
      isDelete: false,
    });

    if (!hotelDb) throw new NotFoundError('Not found hotel');

    const bookings = await bookingService.findManyAndPopulateByQuery(
      {
        query: { status: req.query.status, hotelId },
        page: page,
        limit: 10,
      },
      { path: 'hotelId', select: 'hotelName country city star starRating' },
      { path: 'rooms.roomTypeId', select: 'price -_id nameOfRoom' },
    );

    if (!bookings.length) throw new NotFoundError('Not found booking');

    new CreatedResponse({
      message: 'Get data`s Bookings successfully',
      data: bookings,
    }).send(res);
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
