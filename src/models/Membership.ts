import { Types, Schema, model, SchemaTypes } from 'mongoose';
import { Package } from './Hotel';

export interface TypeMembership {
  userId: Types.ObjectId;
  hotelId: Types.ObjectId;
  package: Package;
  timeStart: Date;
  timeEnd: Date;
  isExpires: boolean;
}

const membershipSchema = new Schema<TypeMembership>({
  userId: {
    type: SchemaTypes.ObjectId,
    required: true,
    ref: 'users',
  },
  hotelId: {
    type: SchemaTypes.ObjectId,
    required: true,
    ref: 'hotels',
  },
  package: {
    type: String,
    enum: Object.values(Package),
    required: true,
  },
  timeStart: { type: Date, default: new Date(), required: true },
  timeEnd: { type: Date, required: true },
  isExpires: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const Membership = model<TypeMembership>('memberships', membershipSchema);
export default Membership;
