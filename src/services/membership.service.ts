import Membership, {
  IMembership,
  membershipDocument,
} from '@/models/Membership';
import BaseService from './base.service';

class MembershipService extends BaseService<IMembership, membershipDocument> {
  constructor() {
    super(Membership);
  }
  // static createMemberships = async (newMembership: IMembership) => {
  //   return await Membership.create(newMembership);
  // };
  // static findMembershipUpdate = async (
  //   query: FilterQuery<membershipDocument>,
  //   update?: UpdateQuery<membershipDocument>,
  //   option?: QueryOptions,
  // ) => {
  //   return await Membership.findOneAndUpdate(query, update, {
  //     lean: true,
  //     ...option,
  //   }).exec();
  // };
  // static findMemberships = async (
  //   queryHotel: QueryWithPagination<IMembership>,
  //   option?: QueryOptions,
  // ) => {
  //   return await Membership.find(queryHotel.query, null, {
  //     lean: true,
  //     ...option,
  //   })
  //     .skip(queryHotel.limit * (queryHotel.page - 1))
  //     .limit(queryHotel.limit)
  //     .exec();
  // };
}

export default new MembershipService();
