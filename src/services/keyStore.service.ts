import SecretKeyStore, { TypeSecretKeyStore } from '@/models/SecretKeyStore';
import { query } from 'express';
import { AnyKeys, FilterQuery, AnyObject, QueryOptions, Types } from 'mongoose';

class SecretKeyStoreService {
  static createStore = async (KeyStore: AnyKeys<TypeSecretKeyStore>) => {
    return await SecretKeyStore.create(KeyStore);
  };
  static findTokenStore = async (
    query: FilterQuery<TypeSecretKeyStore>,
    option?: QueryOptions,
  ) => {
    return await SecretKeyStore.findOne(query, null, {
      lean: true,
      ...option,
    }).exec();
  };
  static deleteALl = async (
    query: FilterQuery<TypeSecretKeyStore>,
    option?: QueryOptions,
  ) => {
    return await SecretKeyStore.deleteMany(query, option);
  };
  static findOneUpdateTokenStore = async (
    query: FilterQuery<TypeSecretKeyStore>,
    update: AnyKeys<TypeSecretKeyStore>,
  ) => {
    return await SecretKeyStore.findOneAndUpdate(
      query,
      {
        $set: update,
      },
      { upsert: true, new: true },
    ).exec();
  };

  static deleteTokenStore = async (
    query: FilterQuery<TypeSecretKeyStore>,
    option?: QueryOptions,
  ) => {
    return await SecretKeyStore.deleteOne(query, option).exec();
  };
}

export default SecretKeyStoreService;
