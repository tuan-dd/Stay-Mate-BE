import User, { IUser, UserDocument } from '@/models/User';
import { QueryOptions, FilterQuery, Types, Document } from 'mongoose';
import BaseService, { QueryWithPagination } from './base.service';
import pwdUtil from '@/utils/pwdUtil';
import { boolean } from 'yup';

class UserService extends BaseService<IUser, UserDocument> {
  constructor() {
    super(User);
  }

  findByIdAndCheckPass = async (
    id: string | Types.ObjectId,
    password: string,
  ): Promise<boolean | UserDocument> => {
    const userDb = await User.findById<UserDocument>(id, null, { lean: false });
    const isValid = await pwdUtil.getCompare(password, userDb.password);
    if (!isValid) return false;
    return userDb;
  };

  findOneUser = async (
    query: FilterQuery<UserDocument>,
    option?: QueryOptions,
  ) => {
    return await User.findOne(query, null, { lean: true, ...option }).exec();
  };

  override findById = async (
    id: string | Types.ObjectId,
    option?: QueryOptions,
  ) => {
    return await User.findById(id, null, { lean: true, ...option })
      .select('-password')
      .exec();
  };

  override findMany = async (
    queryUsers: QueryWithPagination<UserDocument>,
    option?: QueryOptions,
  ) => {
    return await User.find(queryUsers.query, null, {
      lean: true,
      ...option,
    })
      .select('-password')
      .skip(queryUsers.limit * (queryUsers.page - 1))
      .limit(queryUsers.limit)
      .exec();
  };

  findUserByAggregate = async (
    userId: string,
    project: { [key: string]: 0 | 1 },
  ) => {
    return await User.aggregate([
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
    ]);
  };
}

export default new UserService();
