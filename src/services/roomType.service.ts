import RoomType, { RoomDocument, IRoom } from '@/models/Room-type';
import BaseService from './base.service';
import { AnyKeys, FilterQuery, QueryOptions } from 'mongoose';

class RoomTypeService extends BaseService<IRoom, RoomDocument> {
  constructor() {
    super(RoomType);
  }

  createMany = async (doc: AnyKeys<IRoom>[]) => {
    return await RoomType.create(doc);
  };

  deleteRoomType = async (
    query: FilterQuery<RoomDocument>,
    option?: QueryOptions,
  ) => {
    return await RoomType.deleteMany(query, option);
  };

  // static findOneRoomIdUpdate = async (
  //   roomId: string,
  //   update?: UpdateQuery<RoomDocument>,
  //   option?: QueryOptions,
  // ) => {
  //   return await RoomType.findByIdAndUpdate(roomId, update, {
  //     lean: true,
  //     ...option,
  //   }).exec();
  // };
}

export default new RoomTypeService();
