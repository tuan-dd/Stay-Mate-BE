import { QueryOptions, FilterQuery, UpdateQuery } from 'mongoose';
import { QueryWithPagination } from './user.service';
import Membership, {
  TypeMembership,
  membershipDocument,
} from '@/models/Membership';

class MembershipService {
  static createMemberships = async (newMembership: TypeMembership) => {
    return await Membership.create(newMembership);
  };

  static findMembershipUpdate = async (
    query: FilterQuery<membershipDocument>,
    update?: UpdateQuery<membershipDocument>,
    option?: QueryOptions,
  ) => {
    return await Membership.findOneAndUpdate(query, update, {
      lean: true,
      ...option,
    }).exec();
  };

  static findMemberships = async (
    queryHotel: QueryWithPagination<membershipDocument>,
    option?: QueryOptions,
  ) => {
    return await Membership.find(queryHotel.query, null, {
      lean: true,
      ...option,
    })
      .skip(queryHotel.limit * (queryHotel.page - 1))
      .limit(queryHotel.limit)
      .exec();
  };
}

export default MembershipService;
