import Membership, { IMembership, MembershipDocument } from '@/models/Membership';
import BaseService, { QueryWithPagination } from './base.service';
import mongoose, {
  AnyKeys,
  ClientSession,
  ProjectionType,
  QueryOptions,
  SaveOptions,
  Types,
} from 'mongoose';
import addJobToQueue from '@/queue/queue';
import { EJob } from '@/utils/jobs';
import { BadRequestError, ForbiddenError } from '@/helpers/utils';
import userService from './user.service';
import { Package, PricePackage } from '@/models/Hotel';
import hotelsService from './hotels.service';
import { convertDate, convertDateToNumber } from '@/utils/otherUtil';

class MembershipService extends BaseService<IMembership, MembershipDocument> {
  constructor() {
    super(Membership);
  }

  createOneAtomic = (doc: AnyKeys<IMembership>[], option: SaveOptions) => {
    return this.model.create(doc, option);
  };

  override findMany = (
    query: QueryWithPagination<MembershipDocument>,
    select?: ProjectionType<MembershipDocument>,
    option?: QueryOptions,
  ) => {
    return this.model
      .find<MembershipDocument>(query.query, select, {
        lean: true,
        ...option,
      })
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .sort('-createdAt')
      .exec();
  };

  createMembership = async (
    userId: Types.ObjectId,
    packageMembership: Package,
    password: string,
  ) => {
    const newMemberShip: IMembership = {
      userId: userId,
      package: packageMembership,
    };
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      const userDb = await userService.findByIdAndCheckPass(userId, password);

      if (typeof userDb === 'boolean') throw new BadRequestError('Wrong Password');

      if (userDb.account.balance < PricePackage[newMemberShip.package])
        throw new ForbiddenError('Balance less than package');

      const membershipsOfUser = await membershipService.findMany({
        query: { userId: new Types.ObjectId(userId), isExpire: false },
        page: null,
        limit: null,
      });

      if (membershipsOfUser.length !== 0) {
        // lấy ngày kết thúc của các gói chưa hết hạn mới nhất làm ngày bắt đầu của gói mới
        newMemberShip.timeStart = convertDate(membershipsOfUser[0].timeEnd, -1);
      } else {
        // nếu chưa có thì bằng ngày hôm nay
        newMemberShip.timeStart = convertDate(undefined, -1);
      }

      // Cho giá tiền của gói bằng thời số ngày theo tuần tháng năm
      newMemberShip.timeEnd = new Date(
        convertDateToNumber(newMemberShip.timeStart) +
          1000 * 60 * 60 * 24 * PricePackage[newMemberShip.package],
      );

      const createMemberShip = await this.createOneAtomic([newMemberShip], {
        session,
      });

      // update package Hotel
      await hotelsService.updateMemberShip(userId, packageMembership, session);

      // Cho giá tiền của gói bằng thời số ngày theo tuần tháng năm
      userDb.account.balance =
        userDb.account.balance - PricePackage[newMemberShip.package];

      await userDb.save({ session });

      // newMemberShip.timeEnd.getTime() - dayjs().tz('Asia/Ho_Chi_Minh').valueOf()
      const createJob = await addJobToQueue(
        {
          type: EJob.MEMBERSHIP,
          job: { id: createMemberShip[0]._id, userID: userId },
        },
        {
          delay: newMemberShip.timeEnd.getTime() - convertDateToNumber(undefined),
        },
      );

      if (!createJob) throw new BadRequestError('Can`t payment, try again ');

      await session.commitTransaction();
      return createMemberShip[0];
    } catch (error) {
      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
  };
}

const membershipService = new MembershipService();

export default membershipService;
