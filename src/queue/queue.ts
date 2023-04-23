import { Queue, JobsOptions } from 'bullmq';
import appConfig from '@/config/config';
import { WorkerJob } from '@/utils/jobs';
const { host, port, password, name } = appConfig.redis;

const myQueue = new Queue('myQueue', {
  connection: {
    host: host,
    port: parseInt(port),
    password,
    name,
  },
});

const addJobToQueue = async (job: WorkerJob, option: JobsOptions) =>
  await myQueue.add(job.type, job, option);

export default addJobToQueue;
