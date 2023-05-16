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
import { BadRequestError, NotFoundError } from '@/helpers/utils';
import hotelsService from './hotels.service';
import { Package } from '@/models/Hotel';
import { GetDetailSchema } from '@/schema/hotel.schema';

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

    if (!hotelDb || hotelDb.isDelete || hotelDb.package === Package.FREE)
      throw new NotFoundError('Not found hotel');

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

    if (!bookingsDb.length) return hotelDb;

    // kiểm tra trùng room in booking trừ ra số phòng đăt ra
    hotelDb.roomTypeIds.forEach((hotelDbRoom, i) => {
      bookingsDb.forEach((booking) => {
        booking.rooms.forEach((roomOrder) => {
          if (roomOrder.roomTypeId.equals(hotelDbRoom._id)) {
            if (hotelDb.roomTypeIds[i].numberOfRoom < roomOrder.quantity)
              throw new BadRequestError('Exceed the number of rooms');
            hotelDb.roomTypeIds[i].numberOfRoom -= roomOrder.quantity;
          }
        });
      });
    });
    return hotelDb;
  };

  checkHotel = async (props: GetDetailSchema, hotelId: Types.ObjectId) => {
    const hotelDb = await hotelsService.findOneAndPopulateById(hotelId);

    if (!hotelDb || hotelDb.isDelete || hotelDb.package === Package.FREE)
      throw new NotFoundError('Not found hotel');

    const bookingsDb = await Booking.find({
      query: {
        hotelId: hotelId,
        status: Status.SUCCESS,
        startDate: { $gte: props.startDate },
        endDate: { $lte: props.endDate },
      },
      page: null,
      limit: null,
    });

    if (!bookingsDb.length) return hotelDb;

    hotelDb.roomTypeIds.forEach((hotelDbRoom, i) => {
      bookingsDb.forEach((booking) => {
        booking.rooms.forEach((roomOrder) => {
          if (roomOrder.roomTypeId.equals(hotelDbRoom._id)) {
            if (hotelDb.roomTypeIds[i].numberOfRoom < roomOrder.quantity)
              delete hotelDb.roomTypeIds[i];
            hotelDb.roomTypeIds[i].numberOfRoom -= roomOrder.quantity;
          }
        });
      });
    });

    if (!hotelDb.roomTypeIds.length)
      throw new BadRequestError(' Sorry, we are fully booked.');

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
