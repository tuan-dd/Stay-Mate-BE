import Hotel, { HotelDocument, IHotel } from '@/models/Hotel';
import { FilterQuery, PopulateOptions, Types } from 'mongoose';
import BaseService from './base.service';
import { RoomDocument } from '@/models/Room-type';

class HotelService extends BaseService<IHotel, HotelDocument> {
  constructor() {
    super(Hotel);
  }

  findOneAndPopulateById = (
    hotelId: string | Types.ObjectId,
    options?: PopulateOptions,
  ) => {
    return Hotel.findById(hotelId)
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
    return Hotel.findOne(query)
      .populate<{ roomTypeIds: RoomDocument[] }>({
        path: 'roomTypeIds',
        ...options,
      })
      .lean()
      .exec();
  };
}
export default new HotelService();
