import { Types, Schema, model, SchemaTypes, Document } from 'mongoose';
import { Role } from './User';

interface Author {
  name: string;
  authorId: Types.ObjectId;
  role: Role;
}
interface Hotel {
  name: string;
  hotelId: Types.ObjectId;
}
export interface IReview {
  context?: string;
  images: string[];
  starRating: number;
  slug?: string;
  parent_slug?: string;
  author: Author;
  hotel: Hotel;
  roomName?: string[];
  bookingId: Types.ObjectId;
  isReply?: boolean;
  isDelete?: boolean;
}

export interface ReviewDocument extends IReview, Document {
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    context: {
      type: String,
      default: 'no',
      required: true,
    },
    images: {
      type: [String],
    },
    starRating: {
      type: Number,
      default: 0,
      max: 5,
      min: 0,
      required: true,
    },
    slug: {
      type: String, // Date().getTime
      required: true,
      index: true,
      unique: true,
    },
    parent_slug: {
      type: String,
      default: '',
    },
    author: {
      name: { type: String, required: true },
      authorId: { type: SchemaTypes.ObjectId, required: true, ref: 'Users' },
      role: { type: String, required: true, enum: Object.values(Role) },
    },
    hotel: {
      name: {
        type: String,
        required: true,
      },
      hotelId: { type: SchemaTypes.ObjectId, required: true, ref: 'hotels' },
    },
    bookingId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'hotels',
    },
    roomName: {
      type: [String],
      required: true,
      min: 1,
    },
    isReply: {
      type: Boolean, // Date().getTime
      required: true,
      default: false,
    },
    isDelete: {
      type: Boolean, // Date().getTime
      required: true,
      default: false,
    },
  },
  { timestamps: true, collection: 'reviews' },
);

const Review = model<IReview>('reviews', reviewSchema);
export default Review;
