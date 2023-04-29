/* eslint-disable import/no-extraneous-dependencies */
import client from '@/database/init.redisDb';
import { RedisCommandArgument } from '@redis/client/dist/lib/commands';
import { SetOptions } from 'redis';
// set key many time

const set = async (
  key: RedisCommandArgument,
  value: RedisCommandArgument | number,
  options?: SetOptions,
): Promise<any> => {
  return client.set(key, value, options);
};

const setOne = async (
  key: RedisCommandArgument,
  value: RedisCommandArgument,
): Promise<any> => {
  return client.setNX(key, value);
};

// get key and value
const get = async (key: string): Promise<any> => {
  return client.get(key);
};

// set pairs key value
const hSet = async (
  key: RedisCommandArgument,
  value: (RedisCommandArgument | number)[],
): Promise<any> => {
  return client.hSet(key, value);
};

const hGetAll = async (key: RedisCommandArgument): Promise<any> => {
  return client.hGetAll(key);
};

// up down number in hash
const hIncrBy = async (
  key: RedisCommandArgument,
  field: RedisCommandArgument,
  number: number,
): Promise<any> => {
  return client.hIncrBy(key, field, number);
};
const incrBy = async (key: RedisCommandArgument, number: number): Promise<any> => {
  return client.incrBy(key, number);
};

const decrBy = async (key: RedisCommandArgument, number: number): Promise<any> => {
  return client.decrBy(key, number);
};

// limit time delete key value
const expire = async (key: RedisCommandArgument, value: number): Promise<any> => {
  return client.expire(key, value);
};

const deleteKey = async (key: RedisCommandArgument): Promise<any> => {
  return client.del(key);
};
const getTimeExpires = async (key: RedisCommandArgument): Promise<any> => {
  return client.ttl(key);
};

export default {
  set,
  get,
  hGetAll,
  hIncrBy,
  setOne,
  hSet,
  expire,
  deleteKey,
  getTimeExpires,
  incrBy,
  decrBy,
} as const;
