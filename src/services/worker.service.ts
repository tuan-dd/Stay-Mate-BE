/* eslint-disable no-console */
import appConfig from '@/config/config';
import { EJob, WorkerJob } from '@/utils/jobs';
import { Worker, Job } from 'bullmq';
import { getLogger } from 'log4js';
import paymentService from './payment.service';
import { Status } from '@/models/Booking';
import redisUtil from '@/utils/redisUtil';
import { Types } from 'mongoose';
import userService from './user.service';
import hotelsService from './hotels.service';
import reviewService from './review.schema';
import addJobToQueue from '@/queue/queue';

const logger = getLogger('bullmq');

const workerHandler = async (job: Job<WorkerJob>) => {
  switch (job.data.type) {
    case EJob.BOOKING_DECLINE: {
      const bookingDb = await paymentService.bookingService.findById(job.data.data.id, {
        lean: false,
      });
      if (!bookingDb) {
        return;
      }
      if (bookingDb.status === Status.PENDING) {
        bookingDb.status = Status.DECLINE;
        await Promise.all(
          bookingDb.rooms.map(
            async (room) =>
              await redisUtil.incrBy(room.roomTypeId.toHexString(), room.quantity),
          ),
        );

        await bookingDb.save();
      }

      return;
    }
    case EJob.BOOKING_STAY: {
      const bookingDb = await paymentService.bookingService.findByPopulate(
        {
          _id: job.data.data.id,
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
          data: { id: createReview._id.toHexString() },
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
      const reviewDb = await reviewService.findById(job.data.data.id, null, {
        lean: true,
      });

      if (!reviewDb.context && !reviewDb.starRating) {
        await reviewDb.deleteOne();
      }
      return;
    }
    case EJob.MEMBERSHIP: {
      console.log(job.data);
      return;
    }
  }
};

const worker = new Worker('myQueue', workerHandler, {
  connection: {
    host: 'redis-14067.c252.ap-southeast-1-1.ec2.cloud.redislabs.com',
    port: 14067,
    password: appConfig.redis.pass,
    name: 'default',
  },
});

worker.on('completed', (job) => console.log(job.id));

worker.on('failed', (job, err) => {
  logger.error(`${job.data.type} has failed with ${err.message}`);
  console.log(`${job.data.type} has failed with ${err.message}`);
});

export default worker;
