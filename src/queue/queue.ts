import { Queue, JobsOptions } from 'bullmq';
import appConfig from '@/config/config';
import { WorkerJob } from '@/utils/jobs';

const myQueue = new Queue('myQueue', {
  connection: {
    host: 'redis-14067.c252.ap-southeast-1-1.ec2.cloud.redislabs.com',
    port: 14067,
    password: appConfig.redis.pass,
    name: 'default',
  },
});

const addJobToQueue = async (job: WorkerJob, option: JobsOptions) =>
  await myQueue.add(job.type, job, option);

export default addJobToQueue;
