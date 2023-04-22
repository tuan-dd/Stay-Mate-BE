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
  GetBookingSchema,
  GetMembershipSchema,
  PaymentBookingSchema,
  PaymentMembershipSchema,
  WithdrawSchema,
} from '@/schema/payment.schema';
import hotelsService from '@/services/hotels.service';
import paymentService from '@/services/payment.service';
import userService from '@/services/user.service';
import { EJob } from '@/utils/jobs';
import { getConvertCreatedAt, getDeleteFilter, getFilterData } from '@/utils/lodashUtil';
import { Response, Request } from 'express';
import mongoose, { ClientSession, Types } from 'mongoose';

/**
 *  @ thiếu cần bullmq cập nhật lại tiền , vì có cancel để hoàn tiền nên, cần 2 loại balance :
 */
class PaymentController {
  createBooking = async (req: Request<any, any, CreateBookingSchema>, res: Response) => {
    /**
     * @check get numberOfRoom in redis nếu k có mean còn trống
     * @check khách sạn có loai phòng đó k
     * @create tao booking lưu booking id và bullmq 5p redis, giảm số phòng
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

    // kiểm tra số lượng
    // const numberOfRoomsRedis = await Promise.all(
    //   rooms.map((room) => redisUtil.get(room.roomTypeId.toHexString())),
    // );
    // numberOfRoomsRedis.forEach((number, i) => {
    //   const convert = parseInt(number);
    //   if (convert === 0) {
    //     throw new BadRequestError('Out Of room');
    //   }
    //   if (convert < rooms[i].quantity) {
    //     throw new BadRequestError('overbooked the number of rooms ');
    //   }
    // });

    const hotelDb = await hotelsService.findOneAndPopulateByQuery(
      {
        _id: newBooking.hotelId,
        roomTypeIds: {
          // kiểm các loại phòng đặt có phải trong hotelDb k
          $all: newBooking.rooms.map((room) => room.roomTypeId),
        },
      },
      {
        path: 'roomTypeIds',
        match: { _id: { $in: rooms.map((room) => room.roomTypeId) } }, // chỉ lấy ra những phòng user đặt
        select: 'price numberOfRoom nameOfRoom',
      },
    );

    if (!hotelDb) throw new NotFoundError('Cant not find hotel');

    // tìm kiếm các booking ở trong khoảng thời gian đặt của new booking
    const bookingsDb = await paymentService.bookingService.findMany({
      query: {
        hotelId: newBooking.hotelId,
        status: Status.SUCCESS,
        startDate: { $gte: newBooking.startDate },
        endDate: { $lte: newBooking.endDate },
        'rooms.roomTypeId': { $in: rooms.map((room) => room.roomTypeId) },
      },
      page: null,
      limit: null,
    });

    // kiểm tra trùng room in booking trừ ra số phòng đăt ra
    hotelDb.roomTypeIds.forEach((hotelDbRoom, i) => {
      bookingsDb.forEach((booking) => {
        booking.rooms.forEach((room) => {
          if (room.roomTypeId.equals(hotelDbRoom._id)) {
            hotelDb.roomTypeIds[i].numberOfRoom -= room.quantity;
          }
        });
      });
    });
    // tại đây loop qua để tính tổng tiền và kiểm tra còn đủ k
    let total = 0;
    const roomsResults = [];
    hotelDb.roomTypeIds.forEach((hotelDbRoom) => {
      rooms.forEach((roomOrder) => {
        if (roomOrder.roomTypeId.equals(hotelDbRoom._id)) {
          if (roomOrder.quantity > hotelDbRoom.numberOfRoom)
            throw new BadRequestError('Exceed the number of rooms');
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

    const createBooking = await paymentService.bookingService.createOne(newBooking);

    await addJobToQueue(
      {
        type: EJob.BOOKING_DECLINE,
        job: { id: createBooking._id.toHexString() },
      },
      { removeOnComplete: true, delay: 1000 * 60 * 0.5, removeOnFail: true },
    );

    // await Promise.all(
    //   // lưu số lượng phòng lên redis/ cái nào k có thì set mới , nào có thì trừ ra số lương user booking
    //   numberOfRoomsRedis.map((number, i) => {
    //     if (number === null) {
    //       const indexId = hotelDb.roomTypeIds.findIndex((hotelDbRoom) =>
    //         rooms[i].roomTypeId.equals(hotelDbRoom._id),
    //       );
    //       if (indexId > -1) {
    //         return redisUtil.set(
    //           rooms[i].roomTypeId.toHexString(),
    //           hotelDb.roomTypeIds[indexId].numberOfRoom - rooms[i].quantity,
    //         );
    //       }
    //     } else {
    //       return redisUtil.decrBy(rooms[i].roomTypeId.toHexString(), rooms[i].quantity);
    //     }
    //   }),
    // );

    new CreatedResponse({
      message: 'Create Booking successfully',
      data: {
        ...getFilterData(['total', 'startDate', 'endDate', '_id'], createBooking),
        rooms: roomsResults,
        hotel: hotelDb.hotelName,
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
      const bookingDb = await paymentService.bookingService.findOne(
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

      if (userDb.balance < bookingDb.total)
        throw new ForbiddenError('balance less than booking');

      const hotel = await hotelsService.findById(newPayment.hotelId);

      const hotelierDb = await userService.findByIdUpdate(
        hotel.userId,
        {
          $inc: { balance: bookingDb.total },
        },
        { session },
      );

      if (!hotelierDb) throw new NotFoundError('Not found Hotelier');

      userDb.balance = userDb.balance - bookingDb.total;

      await userDb.save({ session });

      bookingDb.status = Status.SUCCESS;

      await bookingDb.save({ session });

      const createJob = await addJobToQueue(
        {
          type: EJob.BOOKING_DECLINE,
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
        data: bookingDb,
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
      const bookingDb = await paymentService.bookingService.findById(
        cancelPayment.bookingId,
        null,
        {
          lean: false,
        },
      );

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

      // Cho giá tiền của gói bằng thời số ngày theo tuần tháng năm
      newMemberShip.timeEnd = new Date(
        newMemberShip.timeStart.getTime() +
          1000 * 60 * 60 * 24 * PricePackage[newMemberShip.package],
      );

      const createMemberShip = await paymentService.memberShipService.createOneAtomic(
        [newMemberShip],
        {
          session,
        },
      );
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

      userDb.balance = userDb.balance - PricePackage[newMemberShip.package];

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

  getMemberShips = async (
    req: Request<any, any, any, GetMembershipSchema>,
    res: Response,
  ) => {
    const userId = new Types.ObjectId(req.headers[KeyHeader.USER_ID] as string);

    let query = getDeleteFilter(['page'], req.query);

    query = getConvertCreatedAt(query, ['']);

    query.userId = userId;
    const page = req.query.page || 1;

    const memberships = await paymentService.memberShipService.findMany({
      query,
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

    let query = getDeleteFilter(['page'], req.query);

    query = getConvertCreatedAt(query, ['']);

    query.userId = userId;

    const bookings = await paymentService.bookingService.findMany({
      query,
      page: page,
      limit: 10,
    });

    new CreatedResponse({
      message: 'Get data`s Bookings successfully',
      data: bookings,
    }).send(res);
  };
}

const paymentController = new PaymentController();

export default paymentController;
