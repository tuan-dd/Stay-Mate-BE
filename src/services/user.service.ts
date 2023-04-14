import User, { TypeUser, UserDocument } from '@/models/User';
import {
  QueryOptions,
  FilterQuery,
  AnyKeys,
  UpdateQuery,
  Types,
} from 'mongoose';

export interface QueryCusTom<t> {
  query: FilterQuery<t>;
  page: number;
  limit: number;
}
class UserService {
  static findOneUser = async (
    query: FilterQuery<UserDocument>,
    option?: QueryOptions,
  ) => {
    return await User.findOne(query, null, { lean: true, ...option }).exec();
  };

  static findById = async (
    id: string | Types.ObjectId,
    option?: QueryOptions,
  ) => {
    return await User.findById(id, null, { lean: true, ...option })
      .select('-password')
      .exec();
  };

  static createUser = async (newUser: AnyKeys<TypeUser>) => {
    return await User.create(newUser);
  };
  static findOneUserUpdate = async (
    query: FilterQuery<UserDocument>,
    update?: UpdateQuery<UserDocument>,
    option?: QueryOptions,
  ) => {
    return await User.findOneAndUpdate(query, update, {
      lean: true,
      ...option,
    }).exec();
  };

  static findUsers = async (
    queryUsers: QueryCusTom<UserDocument>,
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

  static findUserByAggregate = async (
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
      { $project: { 'hotels.roomTypeIds': 0, ...project } },
    ]);
  };
}

export default UserService;
