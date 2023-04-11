import User, { UserType, UserDocument } from '@/models/User';
import { QueryOptions, FilterQuery, AnyKeys, UpdateQuery } from 'mongoose';

class UserService {
  static findOneUser = async (
    query: FilterQuery<UserDocument>,
    option?: QueryOptions,
  ) => {
    return await User.findOne(query, null, { lean: true, ...option }).exec();
  };

  static findById = async (id: string, option?: QueryOptions) => {
    return await User.findById(id, null, { lean: true, ...option }).exec();
  };

  static createUser = async (newUser: AnyKeys<UserType>) => {
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
}

export default UserService;
