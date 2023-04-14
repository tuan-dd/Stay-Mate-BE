import { Types, Schema, model, Document } from 'mongoose';

// const { Types, Schema } = mongoose;
export enum Role {
  HOTELIER = 'HOTELIER',
  USER = 'USER',
  ADMIN = 'ADMIN',
}
export interface TypeUser {
  name: string;
  email?: string;
  password: string;
  balance?: number;
  verify?: boolean;
  avatar?: string;
  role?: Role;
  isActive?: boolean;
}

export interface UserDocument extends TypeUser, Document {
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<TypeUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    // TODO rename to balance
    balance: {
      type: Number,
      default: 0,
      required: true, // TODO: default to 0
    },
    verify: {
      type: Boolean,
      default: false,
      required: true,
    },
    avatar: {
      type: String,
    },
    // prefer "role" than Role
    role: {
      type: String,
      default: Role.USER,
      enum: Object.values(Role),
      required: true,
    },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true, collection: 'users' },
);
import pwt from '@/utils/pwdUtil';

userSchema.pre('save', async function (this, next) {
  if (!this.isModified('password')) return next();

  const salt = await pwt.getSalt();
  const hash = await pwt.getHash(this.password, salt);
  this.password = hash;
});

const User = model<TypeUser>('users', userSchema);
export default User;
