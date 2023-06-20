import User, { IUser, UserDocument } from '@/models/User';
import { QueryOptions, Types } from 'mongoose';
import BaseService from './base.service';
import pwdUtil from '@/utils/pwdUtil';

class UserService extends BaseService<IUser, UserDocument> {
  constructor() {
    super(User);
  }

  findByIdAndCheckPass = async (
    id: string | Types.ObjectId,
    password: string,
    option?: QueryOptions,
  ): Promise<boolean | UserDocument> => {
    const userDb = await this.model.findById<UserDocument>(id, null, {
      lean: false,
      ...option,
    });
    const isValid = await pwdUtil.getCompare(password, userDb.password);
    if (!isValid && !userDb.isActive) return false;
    return userDb;
  };

  findUserByAggregate = async (userId: string, project: { [key: string]: 0 | 1 }) => {
    return this.model
      .aggregate([
        { $match: { _id: new Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'hotels',
            localField: '_id',
            foreignField: 'userId',
            as: 'hotels',
          },
        },
        { $unwind: '$hotels' },
        {
          $lookup: {
            from: 'roomTypes',
            localField: 'hotels.roomTypeIds',
            foreignField: '_id',
            as: 'roomTypes',
          },
        },
        { $project: { 'hotels.roomTypeIds': 0, password: 0, ...project } },
      ])
      .exec();
  };

  findUserAddInfo = async (userId: string, project: { [key: string]: 0 | 1 }) => {
    return this.model
      .aggregate([
        { $match: { _id: new Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'hotels',
            localField: '_id',
            foreignField: 'userId',
            as: 'hotels',
          },
        },
        { $unwind: '$hotels' },
        {
          $lookup: {
            from: 'reviews',
            localField: 'hotels._id',
            foreignField: 'hotel.hotelId',
            as: 'reviews',
          },
        },
        { $unwind: '$reviews' },
        { $group: { _id: 'countReview' } },
        { $project: { 'hotels.roomTypeIds': 0, password: 0, ...project } },
      ])
      .exec();
  };
}
const userService = new UserService();

export default userService;
