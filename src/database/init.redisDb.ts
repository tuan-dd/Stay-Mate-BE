/* eslint-disable no-console */
import { createClient } from 'redis';
import { getLogger } from '@/utils/loggers';
import appConfig from '@/config/config';

const { host, port, password, name } = appConfig.redis;

const logger = getLogger('REDIS');
class RedisConfig {
  private static instance: RedisConfig;

  private url = `redis://${host}:${port}`;

  private clientInstance: ReturnType<typeof createClient>;

  private constructor() {
    this.connectRedis();
  }

  async connectRedis() {
    const client = createClient({
      url: this.url,
      password,
      name,
    });

    client
      .connect()
      .then(() => console.log('Connected redis Success'))
      .catch((err) => logger.error('Redis Error', err));

    this.clientInstance = client;
  }

  static getInstance() {
    if (!RedisConfig.instance) RedisConfig.instance = new RedisConfig();
    return RedisConfig.instance.clientInstance;
  }
}

const client = RedisConfig.getInstance();

export default client;
