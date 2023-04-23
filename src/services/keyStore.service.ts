import SecretKeyStore, { ISecretKeyStore } from '@/models/SecretKeyStore';

import { FilterQuery, QueryOptions } from 'mongoose';
import BaseService from './base.service';

class SecretKeyStoreService extends BaseService<ISecretKeyStore> {
  constructor() {
    super(SecretKeyStore);
  }
  // static createStore = async (KeyStore: AnyKeys<ISecretKeyStore>) => {
  //   return await SecretKeyStore.create(KeyStore);
  // };
  // static findTokenStore = async (
  //   query: FilterQuery<ISecretKeyStore>,
  //   option?: QueryOptions,
  // ) => {
  //   return await SecretKeyStore.findOne(query, null, {
  //     lean: true,
  //     ...option,
  //   }).exec();
  // };
  deleteALl = async (
    query: FilterQuery<ISecretKeyStore>,
    option?: QueryOptions,
  ) => {
    return await SecretKeyStore.deleteMany(query, option);
  };
  // static findOneUpdateTokenStore = async (
  //   query: FilterQuery<ISecretKeyStore>,
  //   update: AnyKeys<ISecretKeyStore>,
  // ) => {
  //   return await SecretKeyStore.findOneAndUpdate(
  //     query,
  //     {
  //       $set: update,
  //     },
  //     { upsert: true, new: true },
  //   ).exec();
  // };
  deleteTokenStore = async (
    query: FilterQuery<ISecretKeyStore>,
    option?: QueryOptions,
  ) => {
    return await SecretKeyStore.deleteOne(query, option).exec();
  };
}

export default new SecretKeyStoreService();
