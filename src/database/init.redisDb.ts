/* eslint-disable no-console */
import { createClient } from 'redis';
import { getLogger } from '@/utils/loggers';
import appConfig from '@/config/config';

const url = `redis://${appConfig.redis.host}${appConfig.redis.port}`;
const client = createClient({
  url,
  password: appConfig.redis.pass,
  name: 'default',
});

const logger = getLogger('REDIS');

client
  .connect()
  .then(() => console.log('Connected redis Success'))
  .catch((err) => logger.error('Redis Error', err));

export default client;
