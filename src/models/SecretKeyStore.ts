import { Types, Schema, model, SchemaTypes } from 'mongoose';

export interface TypeSecretKeyStore {
  userId: Types.ObjectId;
  secretKey: string;
  refreshToken: string;
  deviceId: string;
}

const secretKeyStoreSchema = new Schema<TypeSecretKeyStore>(
  {
    userId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'users',
    },
    secretKey: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, expires: '7day' },
);

const SecretKeyStore = model<TypeSecretKeyStore>(
  'keyStores',
  secretKeyStoreSchema,
);
export default SecretKeyStore;
