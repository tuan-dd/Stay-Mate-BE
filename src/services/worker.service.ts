/* eslint-disable no-console */
import appConfig from '@/config/config';
import { EJob, WorkerJob } from '@/utils/jobs';
import { Worker, Job } from 'bullmq';
import { getLogger } from 'log4js';
import paymentService from './payment.service';
import { Status } from '@/models/Booking';
import { Types } from 'mongoose';
import userService from './user.service';
import hotelsService from './hotels.service';
import reviewService from './review.schema';
import addJobToQueue from '@/queue/queue';
import { Package } from '@/models/Hotel';

const { host, port, password, name } = appConfig.redis;
class WorkerService {
  constructor() {
    this.connect();
  }

  connect() {
    const worker = new Worker('myQueue', this.workerHandler, {
      connection: {
        host: host,
        port: parseInt(port),
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
    switch (job.data.type) {
      case EJob.BOOKING_DECLINE: {
        const bookingDb = await paymentService.bookingService.findById(
          job.data.job.id,
          null,
          {
            lean: false,
          },
        );
        if (!bookingDb) {
          return;
        }
        if (bookingDb.status === Status.PENDING) {
          bookingDb.status = Status.DECLINE;

          await bookingDb.save();
        }

        return;
      }
      case EJob.BOOKING_STAY: {
        const bookingDb = await paymentService.bookingService.findByPopulate(
          {
            _id: job.data.job.id,
          },
          { lean: true },
          { path: 'rooms.roomTypeId', select: 'nameOfRoom -_id' },
        );
        if (!bookingDb) {
          return;
        }
        bookingDb.status = Status.STAY;

        await bookingDb.save();

        const { role, name, _id } = await userService.findById(bookingDb.userId);

        const hotelDb = await hotelsService.findById(bookingDb.hotelId);

        const createReview = await reviewService.createOne({
          context: '',
          images: [],
          starRating: 0,
          slug: new Date().getTime().toString(),
          parent_slug: '',
          author: { name, role, authorId: _id },
          hotel: {
            hotelId: new Types.ObjectId(bookingDb.hotelId),
            name: hotelDb.hotelName,
          },
          roomName: bookingDb.rooms.map((room) => room.roomTypeId.nameOfRoom),
          bookingId: new Types.ObjectId(bookingDb._id),
        });

        await addJobToQueue(
          {
            type: EJob.DELETE_REVIEW,
            job: { id: createReview._id.toHexString() },
          },
          {
            delay: new Date().getTime() + 1000 * 60 * 60 * 24 * 7,
            priority: 10,
            removeOnComplete: true,
          },
        );

        return;
      }
      case EJob.DELETE_REVIEW: {
        const reviewDb = await reviewService.findById(job.data.job.id, null, {
          lean: true,
        });

        if (!reviewDb.context && !reviewDb.starRating) {
          await reviewDb.deleteOne();
        }
        return;
      }
      case EJob.MEMBERSHIP: {
        const membershipsDb = await paymentService.memberShipService.findMany(
          {
            query: new Types.ObjectId(job.data.job.userID),
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

        if (indexMembershipExpired === 0)
          await hotelsService.updateMany(
            {
              userId: new Types.ObjectId(job.data.job.userID),
            },
            { $set: { package: Package.FREE } },
          );

        return;
      }
    }
  };
}

const workerService = new WorkerService();

export default workerService;
