import Booking, { BookingDocument, IBooking, EStatus } from '@/models/Booking';
import BaseService, { QueryWithPagination } from './base.service';
import mongoose, {
  ClientSession,
  FilterQuery,
  PopulateOptions,
  QueryOptions,
  Types,
} from 'mongoose';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/helpers/utils';
import hotelsService from './hotels.service';
import { Package } from '@/models/Hotel';
import { GetDetailSchema } from '@/schema/hotel.schema';
import userService from './user.service';
import addJobToQueue from '@/queue/queue';
import { EJob } from '@/utils/jobs';
import { convertDate, convertDateToNumber } from '@/utils/otherUtil';

interface IRoomReq {
  quantity: number;
  roomTypeId: Types.ObjectId;
}
class BookingService extends BaseService<IBooking, BookingDocument> {
  constructor() {
    super(Booking);
  }

  override findMany = (
    query: QueryWithPagination<BookingDocument>,
    option?: QueryOptions,
  ) => {
    return this.model
      .find<BookingDocument>(query.query, null, {
        lean: true,
        ...option,
      })
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .sort('-createdAt')
      .exec();
  };

  findByPopulate = async (
    query: FilterQuery<BookingDocument>,
    option?: QueryOptions,
    optionPopulate?: PopulateOptions,
  ) => {
    return this.model
      .findById(query, null, { lean: true, ...option })
      .populate({
        path: 'rooms.roomTypeId',
        ...optionPopulate,
      })
      .exec();
  };

  findOneByPopulate = async (
    query: FilterQuery<BookingDocument>,
    option?: QueryOptions,
    options1?: PopulateOptions,
    options2?: PopulateOptions,
  ) => {
    return this.model
      .findOne(query, null, { lean: true, ...option })
      .populate({
        path: 'hotelId',
        ...options1,
      })
      .populate({ path: 'rooms.roomTypeId', ...options2 })
      .exec();
  };

  findManyAndPopulateByQuery = (
    query: QueryWithPagination<BookingDocument>,
    options1?: PopulateOptions,
    options2?: PopulateOptions,
  ) => {
    return this.model
      .find(query.query)
      .populate({
        path: 'hotelId',
        ...options1,
      })
      .populate({ path: 'rooms.roomTypeId', ...options2 })
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .sort('-createdAt')
      .exec();
  };

  findManyAndPopulateByHotelier = (
    query: QueryWithPagination<BookingDocument>,
    options1?: PopulateOptions,
    options2?: PopulateOptions,
  ) => {
    return this.model
      .find(query.query)
      .populate([
        {
          path: 'hotelId',
          ...options1,
        },
        { path: 'rooms.roomTypeId', ...options2 },
        { path: 'userId', select: '-_id name email' },
      ])
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .sort('-createdAt')
      .exec();
  };

  isEnoughRoom = async (newBooking: IBooking, rooms: IRoomReq[]) => {
    const hotelDb = await hotelsService.findOneAndPopulateByQuery(
      {
        _id: newBooking.hotelId,
        roomTypeIds: {
          // kiểm các loại phòng đặt có phải trong hotelDb k
          $all: rooms.map((room) => room.roomTypeId),
        },
      },
      {
        path: 'roomTypeIds',
        match: { _id: { $in: rooms.map((room) => room.roomTypeId) } }, // chỉ lấy ra những phòng user đặt
        select: 'price numberOfRoom nameOfRoom',
      },
    );

    if (!hotelDb || hotelDb.isDelete || hotelDb.package === Package.FREE)
      throw new NotFoundError('Not found hotel');

    // tìm kiếm các Booking ở trong khoảng thời gian đặt của new Booking
    const bookingsDb = await this.model.find({
      hotelId: newBooking.hotelId,
      status: { $in: [EStatus.SUCCESS, EStatus.PENDING] },
      startDate: {
        $gte: convertDate(newBooking.startDate, 11).toISOString(),
      },
      endDate: {
        $lte: convertDate(newBooking.endDate, 13).toISOString(),
      },
      'rooms.roomTypeId': {
        $in: rooms.map((room) => room.roomTypeId),
      },
    });

    if (!bookingsDb.length) return hotelDb;

    // kiểm tra trùng room đã được order pending in booking trừ ra số phòng đăt ra
    hotelDb.roomTypeIds.forEach((hotelDbRoom, i) => {
      bookingsDb.forEach((booking) => {
        booking.rooms.forEach((roomOrder) => {
          if (roomOrder.roomTypeId.equals(hotelDbRoom._id)) {
            hotelDb.roomTypeIds[i].numberOfRoom -= roomOrder.quantity;
          }
        });
      });
    });

    const isEnough = hotelDb.roomTypeIds.every((hotelDbRoom) => {
      let boolean = true;
      rooms.forEach((roomOrder) => {
        if (
          roomOrder.roomTypeId.equals(hotelDbRoom._id) &&
          hotelDbRoom.numberOfRoom < roomOrder.quantity
        ) {
          boolean = false;
        }
      });
      return boolean;
    });

    if (!isEnough) return false;

    return hotelDb;
  };

  checkHotel = async (props: GetDetailSchema, hotelId: Types.ObjectId) => {
    const hotelDb = await hotelsService.findOneAndPopulateById(hotelId);

    if (!hotelDb || hotelDb.isDelete || hotelDb.package === Package.FREE)
      throw new NotFoundError('Not found hotel');

    const bookingsDb = await Booking.find({
      hotelId: hotelDb._id,
      status: { $in: [EStatus.SUCCESS, EStatus.PENDING] },
      startDate: {
        $gte: convertDate(props.startDate, 12).toISOString(),
      },
      endDate: {
        $lte: convertDate(props.endDate, 13).toISOString(),
      },
    });

    if (!bookingsDb.length) return hotelDb;

    // trừ các phòng order trong khoảng ngày đó
    hotelDb.roomTypeIds.forEach((hotelDbRoom) => {
      bookingsDb.forEach((booking) => {
        booking.rooms.forEach((roomOrder) => {
          if (roomOrder.roomTypeId.equals(hotelDbRoom._id)) {
            hotelDbRoom.numberOfRoom -= roomOrder.quantity;
          }
        });
      });
    });

    // lọc ra phòng nhỏ hơn 0
    const resultRoomTypeIds = hotelDb.roomTypeIds.filter(
      (hotelDbRoom) => hotelDbRoom.numberOfRoom > 0,
    );

    hotelDb.roomTypeIds = resultRoomTypeIds;

    return hotelDb;
  };

  createBooking = async (newBooking: IBooking) => {
    const roomOrders = newBooking.rooms;

    const numberOfRoomAfterCheck = await this.isEnoughRoom(newBooking, roomOrders);

    if (!numberOfRoomAfterCheck) throw new BadRequestError('Out of room');

    // tại đây loop qua để tính tổng tiền
    let total = 0;
    const roomsResults = [];
    numberOfRoomAfterCheck.roomTypeIds.forEach((hotelDbRoom) => {
      roomOrders.forEach((roomOrder) => {
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

    // ngày đầu trừ ngày cuối để tính tổng số ngày ở nhân tổng tiền số lượng phòng
    newBooking.total =
      total *
      Math.ceil(
        (convertDateToNumber(newBooking.endDate, false) -
          convertDateToNumber(newBooking.startDate, false)) /
          (60 * 60 * 24),
      );

    const userDb = await userService.findById(newBooking.userId);
    if (newBooking.total > userDb.account.balance)
      throw new BadRequestError('You don`t enough money to booking');

    const createBooking = await this.createOne(newBooking);

    return createBooking;
  };

  paymentBooking = async (
    userId: Types.ObjectId,
    newPayment: { bookingId: Types.ObjectId; hotelId: Types.ObjectId; password: string },
  ) => {
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

      const nowDate = convertDateToNumber(undefined);
      const endDate = convertDateToNumber(bookingDb.endDate);

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
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  };

  cancelBooking = async (
    userId: Types.ObjectId,
    cancelPayment: { bookingId: Types.ObjectId; hotelId: Types.ObjectId },
  ) => {
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();
    try {
      const bookingDb = await bookingService.findById(cancelPayment.bookingId, null, {
        lean: false,
      });

      if (!bookingDb) throw new NotFoundError('Not found payment');

      if (bookingDb.status !== EStatus.SUCCESS)
        throw new NotFoundError('User cant refund');

      const dataNow = convertDateToNumber(undefined);

      if (convertDateToNumber(bookingDb.startDate) - 1000 * 60 * 60 * 12 < dataNow)
        throw new BadRequestError('Overdue to cancel, you only cant cancel before 12h');

      if (!userId.equals(bookingDb.userId)) throw new NotFoundError('Not found Booking');

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
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  };
}

const bookingService = new BookingService();

export default bookingService;
