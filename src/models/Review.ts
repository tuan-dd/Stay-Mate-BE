import { Types, Schema, model, SchemaTypes } from 'mongoose';

interface TypeReview {
  context: string;
  image: string[];
  star: number;
  userId: Types.ObjectId;
  hotelId: Types.ObjectId;
  roomTypeIds: Types.ObjectId[];
}

const reviewSchema = new Schema<TypeReview>(
  {
    context: {
      type: String,
      required: true,
    },
    image: [
      {
        type: String,
      },
    ],
    star: {
      type: Number,
      max: 5,
      min: 1,
      required: true,
    },
    userId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'Users',
    },
    hotelId: {
      type: SchemaTypes.ObjectId,
      required: true,
      ref: 'hotels',
    },
    roomTypeIds: [
      {
        type: SchemaTypes.ObjectId,
        required: true,
        min: 1,
        ref: 'roomTypes',
      },
    ],
  },
  { timestamps: true, collection: 'reviews' },
);

const Review = model<TypeReview>('reviews', reviewSchema);
export default Review;
