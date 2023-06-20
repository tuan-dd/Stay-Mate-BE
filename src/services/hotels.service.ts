import Hotel, { HotelDocument, IHotel, Package } from '@/models/Hotel';
import { ClientSession, FilterQuery, PopulateOptions, Types } from 'mongoose';
import BaseService, { QueryWithPagination } from './base.service';
import { RoomDocument } from '@/models/Room-type';

class HotelService extends BaseService<IHotel, HotelDocument> {
  constructor() {
    super(Hotel);
  }

  findOneAndPopulateById = (
    hotelId: string | Types.ObjectId,
    options?: PopulateOptions,
  ) => {
    return this.model
      .findById(hotelId)
      .populate<{ roomTypeIds: RoomDocument[] }>({
        path: 'roomTypeIds',
        ...options,
      })
      .lean()
      .exec();
  };

  findOneAndPopulateByQuery = (
    query: FilterQuery<HotelDocument>,
    options?: PopulateOptions,
  ) => {
    return this.model
      .findOne<HotelDocument>(query)
      .populate<{ roomTypeIds: RoomDocument[] }>({
        path: 'roomTypeIds',
        ...options,
      })
      .lean()
      .exec();
  };

  findManyAndPopulateByQuery = (
    query: QueryWithPagination<HotelDocument>,
    options?: PopulateOptions,
  ) => {
    return this.model
      .find(query.query)
      .populate<{ roomTypeIds: RoomDocument[] }>({
        path: 'roomTypeIds',
        ...options,
      })
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .exec();
  };

  countQuery = (query: FilterQuery<HotelDocument>) => {
    return this.model.count(query);
  };

  updateMemberShip = async (
    userId: Types.ObjectId,
    packageMembership: Package,
    session: ClientSession,
  ) => {
    if (packageMembership === Package.WEEK)
      await this.updateMany(
        {
          userId: userId,
          package: Package.FREE,
          isDelete: false,
        },
        { $set: { package: packageMembership } },
        { session },
      );
    else if (packageMembership === Package.MONTH) {
      await this.updateMany(
        {
          userId: userId,
          package: Package.WEEK,
          isDelete: false,
        },
        { $set: { package: packageMembership } },
        { session },
      );
    } else {
      await this.updateMany(
        {
          userId: userId,
          isDelete: false,
        },
        { $set: { package: packageMembership } },
        { session },
      );
    }
  };
}
export default new HotelService();
