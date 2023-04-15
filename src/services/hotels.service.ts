import Hotel, { HotelDocument, IHotel } from '@/models/Hotel';
import {
  QueryOptions,
  FilterQuery,
  AnyKeys,
  UpdateQuery,
  PopulateOptions,
} from 'mongoose';
import { QueryWithPagination } from './user.service';
import BaseService from './base.service';

class HotelService2 extends BaseService<IHotel> {
  constructor() {
    super(Hotel);
  }
}

class HotelService {
  // typo
  static createHotels = async (newUser: IHotel) => {
    return await Hotel.create(newUser);
  };

  static findOneHotelUpdate = async (
    query: FilterQuery<HotelDocument>,
    update: UpdateQuery<HotelDocument>,
    option?: QueryOptions,
  ) => {
    return await Hotel.findOneAndUpdate(query, update, {
      lean: true,
      ...option,
    }).exec();
  };

  static findHotelsUpdate = async (
    query: FilterQuery<HotelDocument>,
    update: UpdateQuery<HotelDocument>,
    option?: QueryOptions,
  ) => {
    return await Hotel.updateMany(query, update, {
      lean: true,
      ...option,
    }).exec();
  };

  static findHotels = async (
    queryHotel: QueryWithPagination<HotelDocument>,
    option?: QueryOptions,
  ) => {
    return await Hotel.find(queryHotel.query, null, {
      lean: true,
      ...option,
    })
      .skip(queryHotel.limit * (queryHotel.page - 1))
      .limit(queryHotel.limit)
      .exec();
  };

  static findOneHotelByPopulate = async (
    hotelId: string,
    options?: PopulateOptions,
  ) => {
    return await Hotel.findById(hotelId)
      .populate('roomTypeIds', options)
      .lean()
      .exec();
  };

  static findOneHotel = async (
    queryHotel: FilterQuery<HotelDocument>,
    option?: QueryOptions,
  ) => {
    return await Hotel.findOne(queryHotel, null, {
      lean: true,
      ...option,
    }).exec();
  };
  static findOneByHotelIdUpdate = async (
    hotelId: string,
    update: UpdateQuery<HotelDocument>,
    option?: QueryOptions,
  ) => {
    return await Hotel.findByIdAndUpdate(hotelId, update, {
      lean: true,
      ...option,
    }).exec();
  };
}
export default HotelService;
