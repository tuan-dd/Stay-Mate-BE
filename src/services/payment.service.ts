import Booking, { BookingDocument, IBooking } from '@/models/Booking';
import BaseService, { QueryWithPagination } from './base.service';
import Membership, { IMembership, MembershipDocument } from '@/models/Membership';
import { FilterQuery, PopulateOptions, QueryOptions, SaveOptions } from 'mongoose';

class BookingService extends BaseService<IBooking, BookingDocument> {
  constructor() {
    super(Booking);
  }

  override findMany = async (
    query: QueryWithPagination<BookingDocument>,
    option?: QueryOptions,
  ) => {
    return await this.Model.find(query.query, null, {
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
    return await Booking.findById(query, null, { lean: true, ...option })
      .populate({
        path: 'rooms.roomTypeId',
        ...optionPopulate,
      })
      .exec();
  };
}
class MemberShipService extends BaseService<IMembership> {
  constructor() {
    super(Membership);
  }
  createOneAtomic = async (doc: IMembership, option: SaveOptions) => {
    return await Membership.create(doc, option);
  };

  override findMany = async (
    query: QueryWithPagination<MembershipDocument>,
    option?: QueryOptions,
  ) => {
    return await this.Model.find(query.query, null, {
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

export default { bookingService, memberShipService };
