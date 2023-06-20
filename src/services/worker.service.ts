/* eslint-disable no-console */
import appConfig from '@/config/config';
import { EJob, WorkerJob } from '@/utils/jobs';
import { Worker, Job } from 'bullmq';
import { getLogger } from 'log4js';
import bookingService from './payment.service';
import { EStatus } from '@/models/Booking';
import { Types } from 'mongoose';
import userService from './user.service';
import hotelsService from './hotels.service';
import reviewService from './review.service';
import addJobToQueue from '@/queue/queue';
import { Package } from '@/models/Hotel';
import redisUtil from '@/utils/redisUtil';
import membershipService from './membership.service';

const { host, port, password, name } = appConfig.redis;
class WorkerService {
  constructor() {
    this.connect();
  }

  connect() {
    const worker = new Worker('myQueue', this.workerHandler, {
      connection: {
        host: host,
        port: parseInt(port, 10),
        password,
        name,
      },
    });
    const logger = getLogger('bullmq');

    worker.on('ready', () => console.log('Bull mq Success'));

    worker.on('completed', (job) => console.log(job.id));

    worker.on('failed', (job, err) => {
      logger.error(`${job.data.type} has failed with ${err.message}`);
      console.log(`${job.data.type} has failed with ${err.message}`);
    });
  }

  workerHandler = async (job: Job<WorkerJob>) => {
    // eslint-disable-next-line default-case
    switch (job.data.type) {
      case EJob.BOOKING_DECLINE: {
        const bookingDb = await bookingService.findById(job.data.job.id, null, {
          lean: false,
        });
        if (!bookingDb) {
          return;
        }
        if (bookingDb.status === EStatus.PENDING) {
          bookingDb.status = EStatus.DECLINE;

          await bookingDb.save();
        }

        return;
      }
      case EJob.BOOKING_STAY: {
        const bookingDb = await bookingService.findByPopulate(
          {
            _id: job.data.job.id,
          },
          { lean: false },
          { path: 'rooms.roomTypeId', select: 'nameOfRoom -_id' },
        );
        if (!bookingDb) {
          return;
        }

        const hotelDb = await hotelsService.findById(bookingDb.hotelId);

        await userService.findByIdUpdate(hotelDb.userId, {
          $inc: {
            'account.balance': bookingDb.total,
            'account.virtualBalance': -bookingDb.total,
          },
        });

        const userDb = await userService.findById(bookingDb.userId);

        bookingDb.status = EStatus.STAY;
        await bookingDb.save();

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { _id, role } = userDb;

        if (_id.equals(hotelDb.userId)) {
          return;
        }
        const createReview = await reviewService.createOne({
          images: [],
          starRating: 0,
          slug: new Date().getTime().toString(),
          parent_slug: '',
          author: { name: userDb.name, role, authorId: _id },
          hotel: {
            hotelId: new Types.ObjectId(bookingDb.hotelId),
            name: hotelDb.hotelName,
          },
          rooms: bookingDb.rooms.map((room) => ({
            name: room.roomTypeId.nameOfRoom,
            quantity: room.quantity,
          })),
          startDate: bookingDb.startDate,
          endDate: bookingDb.endDate,
          bookingId: new Types.ObjectId(bookingDb._id),
        });

        const countBookingsByHotel = await redisUtil.get(
          `countBookings:${hotelDb._id.toString()}`,
        );
        if (countBookingsByHotel && parseInt(countBookingsByHotel, 10) > 0) {
          await redisUtil.set(
            `countBookings:${hotelDb._id.toString()}`,
            parseInt(countBookingsByHotel, 10) - 1,
            { EX: 60 * 60 * 10 },
          );
        }

        await addJobToQueue(
          {
            type: EJob.DELETE_REVIEW,
            job: { id: createReview._id.toHexString() },
          },
          {
            delay: new Date().getTime() + 1000 * 60 * 60 * 24 * 7,
            priority: 2,
            removeOnComplete: true,
          },
        );

        return;
      }
      case EJob.DELETE_REVIEW: {
        const reviewDb = await reviewService.findById(job.data.job.id, null, {
          lean: false,
        });

        if (!reviewDb.context || !reviewDb.starRating) {
          return reviewDb.deleteOne();
        }
        return;
      }
      case EJob.MEMBERSHIP: {
        const membershipsDb = await membershipService.findMany(
          {
            query: {
              userId: new Types.ObjectId(job.data.job.userID),
              isExpire: false,
            },
            page: null,
            limit: null,
          },
          { lean: false },
        );

        const indexMembershipExpired = membershipsDb.findIndex((membership) =>
          membership._id.equals(new Types.ObjectId(job.data.job.id)),
        );

        if (indexMembershipExpired < 0) return;

        membershipsDb[indexMembershipExpired].isExpire = true;

        await membershipsDb[indexMembershipExpired].save();

        // find many sort created so index 0 is latest memberships so remove all hotel service
        if (indexMembershipExpired === 0) {
          await hotelsService.updateMany(
            {
              userId: new Types.ObjectId(job.data.job.userID),
            },
            { $set: { package: Package.FREE } },
          );
        }
      }
    }
  };
}

const workerService = new WorkerService();

export default workerService;
