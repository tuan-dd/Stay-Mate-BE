import { Types, Schema, model, SchemaTypes, Document } from 'mongoose';
import { Package } from './Hotel';

export interface IMembership {
  userId: Types.ObjectId;
  package: Package;
  timeStart?: Date;
  timeEnd?: Date;
  isExpire?: boolean;
}

export interface MembershipDocument extends IMembership, Document {
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    userId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'users',
    },
    package: {
      type: String,
      enum: Object.values(Package),
      required: true,
    },
    timeStart: { type: Date, default: new Date(), required: true },
    timeEnd: { type: Date, required: true },
    isExpire: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  { timestamps: true, collection: 'memberships' },
);

const Membership = model<IMembership>('memberships', membershipSchema);
export default Membership;
