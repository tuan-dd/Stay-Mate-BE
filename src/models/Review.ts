import { Types, Schema, model, SchemaTypes } from 'mongoose';

interface TypeReview {
  context: string;
  image: string[];
  star: number;
  userId: Types.ObjectId;
  hotelId: Types.ObjectId;
  roomTypeIDs: Types.ObjectId[];
}

const reviewSchema = new Schema<TypeReview>({
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
  // TYPO
  hotelId: {
    type: SchemaTypes.ObjectId,
    required: true,
    ref: 'hotels',
  },
  // TODO: naming convention (roomId)
  roomTypeIDs: [
    {
      type: SchemaTypes.ObjectId,
      required: true,
      min: 1,
      ref: 'roomTypes',
    },
  ],
});

const Review = model<TypeReview>('Reviews', reviewSchema);
export default Review;
