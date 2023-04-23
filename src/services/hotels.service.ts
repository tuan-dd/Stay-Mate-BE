import Hotel, { HotelDocument, IHotel } from '@/models/Hotel';
import { FilterQuery, PopulateOptions, Types } from 'mongoose';
import BaseService from './base.service';
import { RoomDocument } from '@/models/Room-type';

class HotelService extends BaseService<IHotel, HotelDocument> {
  constructor() {
    super(Hotel);
  }
  // static createHotels = async (newUser: IHotel) => {
  //   return await Hotel.create(newUser);
  // };
  // static findOneHotelUpdate = async (
  //   query: FilterQuery<HotelDocument>,
  //   update: UpdateQuery<HotelDocument>,
  //   option?: QueryOptions,
  // ) => {
  //   return await Hotel.findOneAndUpdate(query, update, {
  //     lean: true,
  //     ...option,
  //   }).exec();
  // };
  // static findHotelsUpdate = async (
  //   query: FilterQuery<HotelDocument>,
  //   update: UpdateQuery<HotelDocument>,
  //   option?: QueryOptions,
  // ) => {
  //   return await Hotel.updateMany(query, update, {
  //     lean: true,
  //     ...option,
  //   }).exec();
  // };
  // static findHotels = async (
  //   queryHotel: QueryWithPagination<HotelDocument>,
  //   option?: QueryOptions,
  // ) => {
  //   return await Hotel.find(queryHotel.query, null, {
  //     lean: true,
  //     ...option,
  //   })
  //     .skip(queryHotel.limit * (queryHotel.page - 1))
  //     .limit(queryHotel.limit)
  //     .exec();
  // };
  findOneAndPopulateById = async (
    hotelId: string | Types.ObjectId,
    options?: PopulateOptions,
  ) => {
    return await Hotel.findById(hotelId)
      .populate<{ roomTypeIds: RoomDocument[] }>({
        path: 'roomTypeIds',
        ...options,
      })
      .lean()
      .exec();
  };

  findOneAndPopulateByQuery = async (
    query: FilterQuery<HotelDocument>,
    options?: PopulateOptions,
  ) => {
    return await Hotel.findOne(query)
      .populate<{ roomTypeIds: RoomDocument[] }>({
        path: 'roomTypeIds',
        ...options,
      })
      .lean()
      .exec();
  };
  // static findOneHotel = async (
  //   queryHotel: FilterQuery<HotelDocument>,
  //   option?: QueryOptions,
  // ) => {
  //   return await Hotel.findOne(queryHotel, null, {
  //     lean: true,
  //     ...option,
  //   }).exec();
  // };
  // static findOneByHotelIdUpdate = async (
  //   hotelId: string,
  //   update: UpdateQuery<HotelDocument>,
  //   option?: QueryOptions,
  // ) => {
  //   return await Hotel.findByIdAndUpdate(hotelId, update, {
  //     lean: true,
  //     ...option,
  //   }).exec();
  // };
}
export default new HotelService();
