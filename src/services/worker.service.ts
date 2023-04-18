/* eslint-disable no-console */
import appConfig from '@/config/config';
import { EJob, WorkerJob } from '@/utils/jobs';
import { Worker, Job } from 'bullmq';
import { getLogger } from 'log4js';
import paymentService from './payment.service';
import { Status } from '@/models/Booking';
import redisUtil from '@/utils/redisUtil';
import { Types } from 'mongoose';

const logger = getLogger('bullmq');

const workerHandler = async (job: Job<WorkerJob>) => {
  switch (job.data.type) {
    case EJob.BOOKING_DECLINE: {
      const bookingDb = await paymentService.bookingService.findById(
        job.data.data.id,
        { lean: false },
      );
      if (!bookingDb) {
        return;
      }
      if (bookingDb.status === Status.PENDING) {
        bookingDb.status = Status.DECLINE;
        await Promise.all(
          bookingDb.rooms.map(
            async (room) =>
              await redisUtil.incrBy(
                room.roomTypeId.toHexString(),
                room.quantity,
              ),
          ),
        );

        await bookingDb.save();
      }

      return;
    }
    case EJob.BOOKING_STAY: {
      const newUpdate = await paymentService.bookingService.findOneUpdate(
        { _id: new Types.ObjectId(job.data.data.id), status: Status.SUCCESS },
        {
          $set: { status: Status.STAY },
        },
      );
      if (!newUpdate) {
        return;
      }
      console.log(job.data);
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
