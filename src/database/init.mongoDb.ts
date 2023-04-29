/* eslint-disable no-console */
import { getLogger } from '@/utils/loggers';
import mongoose from 'mongoose';
import appConfig from '@/config/config';

class Database {
  static instance: Database;

  constructor() {
    this.connect();
  }

  connect() {
    const logger = getLogger('MONGO');
    if (1 === 1) {
      mongoose.set('debug', true);
      mongoose.set('debug', { color: true });
    }

    const url = `${appConfig.database.host}${appConfig.database.port}${appConfig.database.name}`;

    mongoose
      // .connect(url)
      .connect(url, { maxPoolSize: 50 }) //  nầy sau xem với tài nguyên máy tính
      .then(() => console.log('Connected Mongodb Success'))
      .catch((err: mongoose.Error) => logger.error('MongoDB Error', err));
  }

  static getInstance = () => {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  };
}

const instanceMongodb = Database.getInstance();

export default instanceMongodb;
