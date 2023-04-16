import RoomType, { RoomDocument, TypeRoom } from '@/models/Room-type';
import { QueryOptions, FilterQuery, AnyKeys, UpdateQuery } from 'mongoose';

class RoomTypeService {
  static createRoomTypes = async (newRooms: AnyKeys<TypeRoom>[]) => {
    return await RoomType.create(newRooms);
  };

  static deleteRoomType = async (
    query: FilterQuery<RoomDocument>,
    option?: QueryOptions,
  ) => {
    return await RoomType.deleteMany(query, option);
  };

  static findOneRoomIdUpdate = async (
    roomId: string,
    update?: UpdateQuery<RoomDocument>,
    option?: QueryOptions,
  ) => {
    return await RoomType.findByIdAndUpdate(roomId, update, {
      lean: true,
      ...option,
    }).exec();
  };
}

export default RoomTypeService;
