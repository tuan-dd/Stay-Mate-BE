import Booking, { BookingDocument, IBooking, Status } from '@/models/Booking';
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
import { NotAuthorizedError } from '@/helpers/utils';
import hotelsService from './hotels.service';

class BookingService extends BaseService<IBooking, BookingDocument> {
  constructor() {
    super(Booking);
  }

  override findMany = (
    query: QueryWithPagination<BookingDocument>,
    option?: QueryOptions,
  ) => {
    return Booking.find(query.query, null, {
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

  isEnoughRoom = async (newBooking: IBooking, rooms: Types.ObjectId[]) => {
    const hotelDb = await hotelsService.findOneAndPopulateByQuery(
      {
        _id: newBooking.hotelId,
        roomTypeIds: {
          // kiểm các loại phòng đặt có phải trong hotelDb k
          $all: rooms,
        },
      },
      {
        path: 'roomTypeIds',
        match: { _id: { $in: rooms } }, // chỉ lấy ra những phòng user đặt
        select: 'price numberOfRoom nameOfRoom',
      },
    );

    if (!hotelDb) throw new NotAuthorizedError('Cant not find hotel');

    // tìm kiếm các booking ở trong khoảng thời gian đặt của new booking
    const bookingsDb = await Booking.find({
      query: {
        hotelId: newBooking.hotelId,
        status: Status.SUCCESS,
        startDate: { $gte: newBooking.startDate },
        endDate: { $lte: newBooking.endDate },
        'rooms.roomTypeId': { $in: rooms },
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
