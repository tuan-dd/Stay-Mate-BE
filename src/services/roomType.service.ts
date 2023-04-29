import RoomType, { RoomDocument, IRoom } from '@/models/Room-type';
import BaseService from './base.service';
import { AnyKeys, FilterQuery, QueryOptions } from 'mongoose';

class RoomTypeService extends BaseService<IRoom, RoomDocument> {
  constructor() {
    super(RoomType);
  }

  createMany = (doc: AnyKeys<IRoom>[]) => RoomType.create(doc);

  deleteRoomType = (query: FilterQuery<RoomDocument>, option?: QueryOptions) =>
    RoomType.deleteMany(query, option);
}

export default new RoomTypeService();
