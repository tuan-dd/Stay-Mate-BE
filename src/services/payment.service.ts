import Booking, { BookingDocument, IBooking, EStatus } from '@/models/Booking';
import BaseService, { QueryWithPagination } from './base.service';
import Membership, { IMembership, MembershipDocument } from '@/models/Membership';
import {
  AnyKeys,
  FilterQuery,
  PopulateOptions,
  QueryOptions,
  SaveOptions,
  Types,
} from 'mongoose';
import { NotFoundError } from '@/helpers/utils';
import hotelsService from './hotels.service';
import { Package } from '@/models/Hotel';
import { GetDetailSchema } from '@/schema/hotel.schema';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import dayjs from 'dayjs';
dayjs.extend(utc);
dayjs.extend(timezone);

interface IRoomRes {
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
    return Booking.find<BookingDocument>(query.query, null, {
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
    return Booking.findById(query, null, { lean: true, ...option })
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
    return Booking.findOne(query, null, { lean: true, ...option })
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
    return Booking.find(query.query)
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

  isEnoughRoom = async (newBooking: IBooking, rooms: IRoomRes[]) => {
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

    // tìm kiếm các booking ở trong khoảng thời gian đặt của new booking
    const bookingsDb = await Booking.find({
      hotelId: newBooking.hotelId,
      status: { $in: [EStatus.SUCCESS, EStatus.PENDING] },
      startDate: {
        $gte: dayjs(newBooking.startDate)
          .tz('Asia/Ho_Chi_Minh')
          .set('hour', 11)
          .set('minute', 0)
          .toISOString(),
      },
      endDate: {
        $lte: dayjs(newBooking.endDate)
          .tz('Asia/Ho_Chi_Minh')
          .set('hour', 13)
          .set('minute', 0)
          .toISOString(),
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
        $gte: dayjs(props.startDate, 'YYYY-MM-DD')
          .tz('Asia/Ho_Chi_Minh')
          .set('hour', 11)
          .set('minute', 0)
          .toISOString(),
      },
      endDate: {
        $lte: dayjs(props.endDate, 'YYYY-MM-DD')
          .tz('Asia/Ho_Chi_Minh')
          .set('hour', 13)
          .set('minute', 1)
          .toISOString(),
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
}

class MemberShipService extends BaseService<IMembership> {
  constructor() {
    super(Membership);
  }

  createOneAtomic = (doc: AnyKeys<IMembership>[], option: SaveOptions) => {
    return Membership.create(doc, option);
  };

  override findMany = (
    query: QueryWithPagination<MembershipDocument>,
    option?: QueryOptions,
  ) => {
    return Membership.find(query.query, null, {
      lean: true,
      ...option,
    })
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .sort('-createdAt')
      .exec();
  };
}

const bookingService = new BookingService();

const memberShipService = new MemberShipService();

export { bookingService, memberShipService };
