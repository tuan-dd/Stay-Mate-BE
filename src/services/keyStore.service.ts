import SecretKeyStore, { ISecretKeyStore } from '@/models/SecretKeyStore';

import { FilterQuery, QueryOptions } from 'mongoose';
import BaseService from './base.service';

class SecretKeyStoreService extends BaseService<ISecretKeyStore> {
  constructor() {
    super(SecretKeyStore);
  }

  deleteALl = (query: FilterQuery<ISecretKeyStore>, option?: QueryOptions) => {
    return SecretKeyStore.deleteMany(query, option);
  };

  deleteTokenStore = (query: FilterQuery<ISecretKeyStore>, option?: QueryOptions) => {
    return SecretKeyStore.deleteOne(query, option).exec();
  };
}

export default new SecretKeyStoreService();
