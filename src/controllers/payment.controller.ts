import {
  BadRequestError,
  CreatedResponse,
  ForbiddenError,
  NotFoundError,
  SuccessResponse,
} from '@/helpers/utils';
import { KeyHeader } from '@/middleware/validate';
import { IBooking, Status } from '@/models/Booking';
import { PricePackage } from '@/models/Hotel';
import { IMembership } from '@/models/Membership';
import addJobToQueue from '@/queue/queue';
import {
  CancelBookingSchema,
  ChargeSchema,
  CreateBookingSchema,
  GetPayments,
  PaymentBookingSchema,
  PaymentMembershipSchema,
  WithdrawSchema,
} from '@/schema/payment.schema';
import hotelsService from '@/services/hotels.service';
import paymentService from '@/services/payment.service';
import userService from '@/services/user.service';
import { EJob } from '@/utils/jobs';
import { getFilterData } from '@/utils/lodashUtil';
import redisUtil from '@/utils/redisUtil';
import { Response, Request } from 'express';
import mongoose, { ClientSession, Types } from 'mongoose';
class PaymentController {
  createBooking = async (req: Request<any, any, CreateBookingSchema>, res: Response) => {
    /**
     * @check get numberOfRoom in redis nếu k có mean còn trống
     * @check tiếp khách sạn có phòng đó k
     * @create tao booking lưu booking id và expired 5p redis, giảm số phòng
     *
     *
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
    };

    const rooms = newBooking.rooms;

    const numberOfRoomsRedis = await Promise.all(
      rooms.map(async (room) => await redisUtil.get(room.roomTypeId.toHexString())),
    );

    numberOfRoomsRedis.forEach((number, i) => {
      const convert = parseInt(number);
      if (convert === 0) {
        throw new BadRequestError('Out Of room');
      }
      if (convert < rooms[i].quantity) {
        throw new BadRequestError('overbooked the number of rooms ');
      }
    });

    const hotelDb = await hotelsService.findOneAndPopulateByQuery(
      {
        _id: newBooking.hotelId,
        roomTypeIds: {
          $all: newBooking.rooms.map((room) => room.roomTypeId),
        },
      },
      {
        path: 'roomTypeIds',
        match: { _id: { $in: rooms.map((room) => room.roomTypeId) } },
        select: 'price numberOfRoom nameOfRoom',
      },
    );

    if (!hotelDb) throw new NotFoundError('cant not find hotel');

    let total = 0;
    const roomsResult = [];
    hotelDb.roomTypeIds.forEach((hotelDbRoom) => {
      rooms.forEach((roomOrder) => {
        if (roomOrder.roomTypeId.equals(hotelDbRoom._id)) {
          if (roomOrder.quantity > hotelDbRoom.numberOfRoom)
            throw new BadRequestError('Exceed the number of rooms');
          const roomResult = {
            nameOfRoom: hotelDbRoom.nameOfRoom,
            quantity: roomOrder.quantity,
          };
          roomsResult.push(roomResult);
          total += roomOrder.quantity * hotelDbRoom.price;
        }
      });
    });
    newBooking.total = total;

    const createBooking = await paymentService.bookingService.createOne(newBooking);

    await addJobToQueue(
      {
        type: EJob.BOOKING_DECLINE,
        data: { id: createBooking._id.toHexString() },
      },
      { removeOnComplete: true, delay: 1000 * 60 * 3 },
    );

    await Promise.all(
      numberOfRoomsRedis.map(async (number, i) => {
        if (number === null) {
          const indexId = hotelDb.roomTypeIds.findIndex((hotelDbRoom) =>
            rooms[i].roomTypeId.equals(hotelDbRoom._id),
          );
          if (indexId > -1) {
            return await redisUtil.set(
              rooms[i].roomTypeId.toHexString(),
              hotelDb.roomTypeIds[indexId].numberOfRoom - rooms[i].quantity,
            );
          }
        } else {
          return await redisUtil.decrBy(
            rooms[i].roomTypeId.toHexString(),
            rooms[i].quantity,
          );
        }
      }),
    );

    new CreatedResponse({
      message: 'Create Booking successfully',
      data: {
        ...getFilterData(['total', 'startDate', 'endDate', '_id'], createBooking),
        rooms: roomsResult,
        hotel: hotelDb.hotelName,
      },
    }).send(res);
  };

  paymentBooking = async (
    req: Request<any, any, PaymentBookingSchema>,
    res: Response,
  ) => {
    const newPayment = req.body;
    const userId = req.headers[KeyHeader.USER_ID] as string;

    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      const bookingDb = await paymentService.bookingService.findById(
        newPayment.bookingId,
      );

      if (!bookingDb) throw new NotFoundError('Not found payment');

      if (bookingDb.status === Status.DECLINE)
        throw new BadRequestError('Payment expired');

      const userDb = await userService.findByIdAndCheckPass(userId, newPayment.password);

      if (typeof userDb === 'boolean')
        throw new ForbiddenError('can`t payment, try again');

      if (userDb.balance < bookingDb.total)
        throw new ForbiddenError('balance less than booking');

      const hotelierDb = await userService.findByIdUpdate(
        newPayment.hotelierId,
        {
          $inc: { balance: bookingDb.total },
        },
        { session },
      );

      if (!hotelierDb) {
        session.abortTransaction();
        throw new NotFoundError('Not found Hotelier');
      }

      userDb.balance = userDb.balance - bookingDb.total;

      await userDb.save({ session });

      const createJob = await addJobToQueue(
        {
          type: EJob.BOOKING_DECLINE,
          data: { id: bookingDb._id.toHexString() },
        },
        {
          delay: bookingDb.endDate.getTime(),
          removeOnComplete: true,
        },
      );

      if (!createJob) throw new BadRequestError('can`t payment, try again ');

      await session.commitTransaction();

      new SuccessResponse({
        message: 'payment Booking successfully',
        data: 'result',
      }).send(res);
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  };

  cancelBooking = async (req: Request<any, any, CancelBookingSchema>, res: Response) => {
    const payment = req.body;
    const userId = req.headers[KeyHeader.USER_ID] as string;

    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();
    try {
      const bookingDb = await paymentService.bookingService.findById(payment.bookingId, {
        lean: false,
      });
      if (!bookingDb) throw new NotFoundError('Not found payment');

      const dataNow = new Date().getTime();

      if (bookingDb.startDate.getTime() - 1000 * 60 * 60 * 12 < dataNow)
        throw new BadRequestError('Overdue to cancel, you only cant cancel before 12h');

      if (userId !== bookingDb._id.toHexString())
        throw new NotFoundError('not found Booking');

      const hotelierDb = await userService.findByIdUpdate(
        payment.hotelierId,
        {
          $inc: { balance: -bookingDb.total },
        },
        { session },
      );

      if (!hotelierDb) throw new NotFoundError('Not found Hotelier');

      await userService.findByIdUpdate(
        userId,
        {
          $inc: { balance: bookingDb.total },
        },
        { session },
      );

      bookingDb.status = Status.CANCEL;

      await bookingDb.save({ session });

      await session.commitTransaction();

      new SuccessResponse({
        message: 'cancel Booking successfully',
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

      if (userDb.balance < PricePackage[newMemberShip.package])
        throw new ForbiddenError('Balance less than package');

      const membershipsOfUser = await paymentService.memberShipService.findMany({
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

      // cho giá tiền của gói bằng thời số ngày theo tuần tháng năm
      newMemberShip.timeEnd = new Date(
        new Date().getTime() + 1000 * 60 * 60 * 24 * PricePackage[newMemberShip.package],
      );
      const createMemberShip = await paymentService.memberShipService.createOneAtomic(
        newMemberShip,
        {
          session,
        },
      );

      await hotelsService.findOneUpdate(
        { userId: newMemberShip.userId },
        { $set: { package: newMemberShip.package } },
        { session },
      );

      userDb.balance = userDb.balance - PricePackage[newMemberShip.package];
      await userDb.save({ session });

      const createJob = await addJobToQueue(
        {
          type: EJob.MEMBERSHIP,
          data: { id: createMemberShip[0]._id },
        },
        { delay: newMemberShip.timeEnd.getTime() },
      );

      if (!createJob) throw new BadRequestError('can`t payment, try again ');

      await session.commitTransaction();
      new CreatedResponse({
        message: 'payment membership successfully',
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
    const userId = req.header[KeyHeader.USER_ID];

    const updateBalance = await userService.findByIdUpdate(
      userId,
      {
        $inc: { balance: balance },
      },
      {
        new: true,
      },
    );

    new SuccessResponse({
      message: 'charge successfully',
      data: updateBalance.balance,
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

      if (userDb.balance < newUpdate.withdraw)
        throw new ForbiddenError('Balance less than withdraw');

      userDb.balance = userDb.balance - newUpdate.withdraw;

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

  getMemberShips = async (req: Request<any, any, GetPayments>, res: Response) => {
    const userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);
    const page = req.body.page || 1;

    const memberships = await paymentService.memberShipService.findMany({
      query: { userId },
      page: page,
      limit: 10,
    });

    new CreatedResponse({
      message: 'Get data`s payment successfully',
      data: memberships,
    }).send(res);
  };

  getBookings = async (req: Request<any, any, GetPayments>, res: Response) => {
    const userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);
    const page = req.body.page || 1;

    const bookings = await paymentService.bookingService.findMany({
      query: { userId, status: req.body.status },
      page: page,
      limit: 10,
    });

    new CreatedResponse({
      message: 'Get data`s payment successfully',
      data: bookings,
    }).send(res);
  };
}

const paymentController = new PaymentController();

export default paymentController;
